type HttpMethod = "GET" | "POST";

type RequestOptions = {
  method?: HttpMethod;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  contentType?: "json" | "form";
};

export type DelhiveryClientConfig = {
  baseUrl: string;
  token: string;
  userAgent?: string;
};

export class DelhiveryApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "DelhiveryApiError";
    this.status = status;
    this.details = details;
  }
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (query) {
    const params = new URLSearchParams();
    for (const [key, rawValue] of Object.entries(query)) {
      if (rawValue === undefined || rawValue === null) {
        continue;
      }
      params.set(key, String(rawValue));
    }
    url.search = params.toString();
  }
  return url.toString();
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function createDelhiveryClient(config: DelhiveryClientConfig) {
  const { baseUrl, token, userAgent } = config;
  async function request<TData = unknown>(options: RequestOptions): Promise<TData> {
    const { method = "GET", path, query, body, contentType = "json" } = options;

    const url = buildUrl(baseUrl, path, query);
    const headers: Record<string, string> = {
      Authorization: `Token ${token}`,
    };
    if (userAgent) {
      headers["User-Agent"] = userAgent;
    }
    let serializedBody: BodyInit | undefined;
    if (method === "POST" && body !== undefined) {
      if (contentType === "form") {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        serializedBody =
          body instanceof URLSearchParams
            ? body.toString()
            : typeof body === "string"
            ? body
            : new URLSearchParams(
                Object.entries(body as Record<string, string>).map(([key, value]) => [
                  key,
                  String(value ?? ""),
                ])
              ).toString();
      } else {
        headers["Content-Type"] = "application/json";
        serializedBody = JSON.stringify(body);
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body: serializedBody,
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      const message =
        typeof payload === "object" && payload !== null && "message" in payload
          ? String((payload as Record<string, unknown>).message)
          : `Delhivery API request failed with status ${response.status}`;
      throw new DelhiveryApiError(message, response.status, payload);
    }

    return payload as TData;
  }

  async function checkServiceability(params: {
    originPincode: string;
    destinationPincode: string;
    paymentType: "Prepaid" | "COD";
    weightGrams?: number;
    declaredValue?: number;
  }) {
    const filterCodes = [params.originPincode, params.destinationPincode]
      .map((code) => code.trim())
      .filter((code) => code.length > 0)
      .join(",");

    return request<unknown>({
      method: "GET",
      path: "c/api/pin-codes/json",
      query: {
        filter_codes: filterCodes,
      },
    });
  }

  async function getInvoiceCharges(params: {
    originPincode: string;
    destinationPincode: string;
    paymentType: "Prepaid" | "COD";
    chargeableWeightGrams?: number;
    mode?: "E" | "S";
  }) {
    const chargeableWeight =
      params.chargeableWeightGrams && Number.isFinite(params.chargeableWeightGrams)
        ? Math.max(100, Math.round(params.chargeableWeightGrams))
        : 1000;

    return request<Record<string, unknown>>({
      method: "GET",
      path: "api/kinko/v1/invoice/charges/.json",
      query: {
        md: params.mode ?? "E",
        ss: "Delivered",
        d_pin: params.destinationPincode,
        o_pin: params.originPincode,
        cgm: chargeableWeight,
        pt: params.paymentType === "COD" ? "COD" : "Pre-paid",
      },
    });
  }

  async function createShipment(payload: {
    shipments: Array<Record<string, unknown>>;
    pickupLocation: Record<string, unknown>;
  }) {
    const formBody = new URLSearchParams({
      format: "json",
      data: JSON.stringify({
        pickups: [],
        delivery_centre: null,
        pickup_location: payload.pickupLocation,
        shipments: payload.shipments,
      }),
    }).toString();

    return request<Record<string, unknown>>({
      method: "POST",
      path: "api/cmu/create.json",
      body: formBody,
      contentType: "form",
    });
  }

  async function trackShipment(waybill: string) {
    return request<Record<string, unknown>>({
      method: "GET",
      path: "api/v1/packages/json",
      query: {
        waybill,
      },
    });
  }

  return {
    checkServiceability,
    getInvoiceCharges,
    createShipment,
    trackShipment,
  };
}
