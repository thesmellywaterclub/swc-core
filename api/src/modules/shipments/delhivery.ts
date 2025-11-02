type HttpMethod = "GET" | "POST";

type RequestOptions = {
  method?: HttpMethod;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
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
    const { method = "GET", path, query, body } = options;

    const url = buildUrl(baseUrl, path, query);
    const headers: Record<string, string> = {
      Authorization: `Token ${token}`,
    };
    if (userAgent) {
      headers["User-Agent"] = userAgent;
    }
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
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

  async function createShipment(payload: {
    shipments: Array<Record<string, unknown>>;
    pickupLocation: Record<string, unknown>;
  }) {
    return request<Record<string, unknown>>({
      method: "POST",
      path: "api/cmu/create.json",
      body: {
        format: "json",
        pickup_location: payload.pickupLocation,
        shipments: payload.shipments,
      },
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
    createShipment,
    trackShipment,
  };
}
