import type { ShipmentStatus } from "@prisma/client";

import { env } from "../../env";
import { createHttpError } from "../../middlewares/error";
import { prisma } from "../../prisma";
import { logger } from "../../logger";
import { createDelhiveryClient, DelhiveryApiError } from "./delhivery";
import type {
  CreateShipmentInput,
  ServiceabilityInput,
  ShippingQuoteInput,
} from "./shipments.schemas";

const delhiveryClient = createDelhiveryClient({
  baseUrl: env.delhiveryApiUrl,
  token: env.delhiveryApiToken,
  userAgent: "SWC-API/Shipments",
});

type Nullable<T> = T | null;

export type ServiceabilityResult = {
  isServiceable: boolean;
  codAvailable: boolean;
  prepaidAvailable: boolean;
  estimatedDeliveryDays: Nullable<number>;
  estimatedDeliveryDate: Nullable<string>;
  charges: {
    total: Nullable<number>;
    base: Nullable<number>;
    cod: Nullable<number>;
  };
  raw: unknown;
};

export type ShipmentCreationResult = {
  shipment: {
    id: string;
    orderId: string;
    orderItemId: string;
    trackingNumber: string;
    status: ShipmentStatus;
    provider: string;
    courierName: Nullable<string>;
    labelUrl: Nullable<string>;
    createdAt: string;
  };
  delhivery: {
    status: Nullable<string>;
    remarks: Nullable<string>;
    waybill: string;
    manifestUrl: Nullable<string>;
    raw: Record<string, unknown>;
  };
};

export type TrackingEvent = {
  status: string;
  code: Nullable<string>;
  location: Nullable<string>;
  timestamp: Nullable<string>;
  remarks: Nullable<string>;
  instructions: Nullable<string>;
};

export type TrackingResult = {
  waybill: string;
  currentStatus: string;
  currentStatusCode: Nullable<string>;
  currentStatusDate: Nullable<string>;
  events: TrackingEvent[];
  raw: Record<string, unknown>;
};

function toNumber(value: unknown): Nullable<number> {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

function toBoolean(value: unknown): Nullable<boolean> {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["y", "yes", "true", "1"].includes(normalized)) {
      return true;
    }
    if (["n", "no", "false", "0"].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function toIsoDate(value: unknown): Nullable<string> {
  if (typeof value === "string" && value.trim().length > 0) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return null;
}

function combineAddress(
  address: Pick<
    CreateShipmentInput["pickup"],
    "addressLine1" | "addressLine2"
  >
): string {
  return [address.addressLine1, address.addressLine2].filter(Boolean).join(", ");
}

function readWaybill(
  source: Record<string, unknown> | null | undefined,
  keys: string[]
): string | null {
  if (!source) {
    return null;
  }
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function compactRecord<T extends Record<string, unknown>>(record: T): T {
  const entries = Object.entries(record).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );
  return Object.fromEntries(entries) as T;
}

function normaliseShipmentStatus(
  statusText: Nullable<string>,
  statusType?: Nullable<string>
): ShipmentStatus {
  const normalizedText = statusText?.toLowerCase() ?? "";
  const normalizedType = statusType?.toLowerCase() ?? "";

  if (normalizedText.includes("delivered") || normalizedType === "dl") {
    return "delivered";
  }
  if (normalizedText.includes("out for delivery") || normalizedType === "ofd") {
    return "out_for_delivery";
  }
  if (normalizedText.includes("in transit") || normalizedType === "int") {
    return "in_transit";
  }
  if (
    normalizedText.includes("pickup scheduled") ||
    normalizedText.includes("picked") ||
    normalizedType === "picked"
  ) {
    return "pickup_scheduled";
  }
  if (normalizedText.includes("manifested") || normalizedText.includes("label")) {
    return "label_created";
  }
  if (normalizedText.includes("rto") || normalizedText.includes("return")) {
    return "returned";
  }
  if (
    normalizedText.includes("exception") ||
    normalizedText.includes("cancelled") ||
    normalizedType === "und"
  ) {
    return "exception";
  }

  return "in_transit";
}

function calculateEstimatedDate(days: Nullable<number>, fallbackIso: Nullable<string>): Nullable<string> {
  if (typeof days === "number" && Number.isFinite(days)) {
    const estimated = new Date();
    estimated.setDate(estimated.getDate() + Math.ceil(days));
    return estimated.toISOString();
  }
  return fallbackIso ?? null;
}

export async function checkServiceAvailability(
  input: ServiceabilityInput
): Promise<ServiceabilityResult> {
  try {
    const response = await delhiveryClient.checkServiceability({
      originPincode: input.origin.pincode,
      destinationPincode: input.destination.pincode,
      paymentType: input.shipment?.paymentType ?? "Prepaid",
      weightGrams: input.shipment?.weightGrams,
      declaredValue: input.shipment?.declaredValue,
    });

    let detail: Record<string, unknown> | null = null;

    if (
      response &&
      typeof response === "object" &&
      "delivery_details" in response &&
      Array.isArray((response as Record<string, unknown>).delivery_details)
    ) {
      const entry = ((response as Record<string, unknown>).delivery_details as unknown[])[0];
      detail = (entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null);
    }

    if (!detail && typeof response === "object" && response !== null) {
      const deliveryCodes = (response as Record<string, unknown>).delivery_codes;
      if (Array.isArray(deliveryCodes) && deliveryCodes.length > 0) {
        const first = deliveryCodes[0];
        if (
          first &&
          typeof first === "object" &&
          "postal_code" in first &&
          Array.isArray((first as Record<string, unknown>).postal_code)
        ) {
          const entry = ((first as Record<string, unknown>).postal_code as unknown[])[0];
          detail = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null;
        }
      }
    }

    const codAvailable = toBoolean(detail?.cod) ?? false;
    const prepaidAvailable =
      toBoolean(detail?.prepaid) ??
      toBoolean(detail?.prepaid_serviceable) ??
      true;
    const isServiceable =
      (toBoolean(detail?.serviceable) ??
        toBoolean(detail?.is_servicable) ??
        false) ||
      Boolean(codAvailable) ||
      Boolean(prepaidAvailable);

    const estimatedDeliveryDays =
      toNumber(detail?.etd) ??
      toNumber(detail?.tat) ??
      toNumber(detail?.expected_delivery_days);

    const estimatedDeliveryDate = calculateEstimatedDate(
      estimatedDeliveryDays,
      toIsoDate(detail?.edd)
    );

    const charges = {
      total:
        toNumber(detail?.total_amount) ??
        toNumber(detail?.charge) ??
        toNumber(detail?.total),
      base: toNumber(detail?.base_amount) ?? toNumber(detail?.freight_charges),
      cod: toNumber(detail?.cod_charges) ?? toNumber(detail?.cod_amount),
    };

    return {
      isServiceable: Boolean(isServiceable),
      codAvailable: Boolean(codAvailable),
      prepaidAvailable: Boolean(prepaidAvailable),
      estimatedDeliveryDays: estimatedDeliveryDays ?? null,
      estimatedDeliveryDate,
      charges,
      raw: response,
    };
  } catch (error) {
    if (error instanceof DelhiveryApiError) {
      logger.error("Delhivery serviceability lookup failed", {
        status: error.status,
        details: error.details,
      });
      throw createHttpError(
        error.status === 401 ? 502 : error.status,
        "Unable to fetch serviceability from Delhivery",
        error.details
      );
    }
    throw error;
  }
}

export async function createShipmentForOrderItem(
  input: CreateShipmentInput,
  requestedByUserId: string | null
): Promise<ShipmentCreationResult> {
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: input.orderItemId },
    include: {
      shipment: true,
      order: {
        select: {
          id: true,
          status: true,
          userId: true,
          guestEmail: true,
        },
      },
      sellerLocation: true,
      seller: true,
    },
  });

  if (!orderItem) {
    throw createHttpError(404, "Order item not found");
  }

  if (orderItem.shipment) {
    throw createHttpError(409, "Shipment already exists for this order item");
  }

  if (
    requestedByUserId &&
    orderItem.order.userId &&
    orderItem.order.userId !== requestedByUserId
  ) {
    throw createHttpError(403, "You are not permitted to create shipments for this order");
  }

  const totalAmount = Number((orderItem.lineTotalPaise / 100).toFixed(2));
  const codAmount =
    input.paymentType === "COD"
      ? Number((input.codAmount ?? totalAmount).toFixed(2))
      : 0;
  const declaredValue =
    input.shipment.declaredValue !== undefined
      ? Number(input.shipment.declaredValue.toFixed(2))
      : totalAmount;

  const shipmentsPayload = [
    compactRecord({
      order: input.referenceNumber ?? orderItem.orderId,
      refno: input.referenceNumber ?? orderItem.orderId,
      products_desc: input.shipment.description,
      payment_mode: input.paymentType,
      total_amount: totalAmount,
      cod_amount: input.paymentType === "COD" ? codAmount : "Prepaid",
      collectable_amount: input.paymentType === "COD" ? codAmount : "Prepaid",
      declared_value: declaredValue,
      weight: Number((input.shipment.weightGrams / 1000).toFixed(3)),
      shipment_length: input.shipment.lengthCm,
      shipment_width: input.shipment.widthCm,
      shipment_height: input.shipment.heightCm,
      name: input.delivery.name,
      phone: input.delivery.phone,
      email: input.delivery.email,
      add: combineAddress(input.delivery),
      city: input.delivery.city,
      state: input.delivery.state,
      country: input.delivery.country,
      pin: input.delivery.pincode,
      return_pin: input.pickup.pincode,
      return_city: input.pickup.city,
      return_phone: input.pickup.phone,
      return_add: combineAddress(input.pickup),
      return_state: input.pickup.state,
      return_country: input.pickup.country ?? "India",
      hsn_code: "",
      order_date: new Date().toISOString(),
      seller_inv: input.referenceNumber ?? orderItem.orderId,
      quantity: orderItem.quantity ?? 1,
      shipping_mode: "Surface",
      address_type: "",
      promised_delivery_date: input.promisedDeliveryDate,
    }),
  ];

  const sellerLocation = orderItem.sellerLocation;
  const seller = orderItem.seller;

  const effectivePickup = sellerLocation
    ? {
        name:
          sellerLocation.contactName ??
          seller?.displayName ??
          seller?.name ??
          input.pickup.name,
        phone:
          sellerLocation.contactPhone ??
          seller?.phone ??
          input.pickup.phone,
        email: seller?.email ?? input.pickup.email,
        addressLine1: sellerLocation.address1,
        addressLine2: sellerLocation.address2 ?? undefined,
        city: sellerLocation.city,
        state: sellerLocation.state,
        country: input.pickup.country ?? "India",
        pincode: sellerLocation.pincode,
        delhiveryPickupCode: sellerLocation.delhiveryPickupCode,
      }
    : {
      name: input.pickup.name,
        phone: input.pickup.phone,
        email: input.pickup.email,
        addressLine1: input.pickup.addressLine1,
        addressLine2: input.pickup.addressLine2,
        city: input.pickup.city,
        state: input.pickup.state,
        country: input.pickup.country ?? "India",
        pincode: input.pickup.pincode,
        delhiveryPickupCode: undefined,
      };

  logger.info(effectivePickup);    

  const pickupLocation = compactRecord({
    name: effectivePickup.delhiveryPickupCode ?? effectivePickup.name
  });

  logger.info("Delhivery shipment request", {
    orderItemId: orderItem.id,
    pickupLocation,
    shipmentCount: shipmentsPayload.length,
  });

  let delhiveryResponse: Record<string, unknown>;
  try {
    delhiveryResponse = await delhiveryClient.createShipment({
      shipments: shipmentsPayload,
      pickupLocation,
    });
    logger.info("Delhivery shipment response", {
      orderItemId: orderItem.id,
      response: delhiveryResponse,
    });
  } catch (error) {
    if (error instanceof DelhiveryApiError) {
      logger.error("Delhivery shipment creation failed", {
        status: error.status,
        details: error.details,
      });
      throw createHttpError(
        error.status === 401 ? 502 : error.status,
        "Failed to create shipment with Delhivery",
        error.details
      );
    }
    throw error;
  }

  const packages = Array.isArray(delhiveryResponse.packages)
    ? delhiveryResponse.packages
    : [];
  const packageInfo =
    (packages[0] as Record<string, unknown> | undefined) ?? undefined;

  const packageStatus =
    typeof packageInfo?.status === "string" ? packageInfo.status : null;
  const normalizedPackageStatus = packageStatus?.trim().toLowerCase() ?? "success";

  if (
    normalizedPackageStatus.includes("failed") ||
    normalizedPackageStatus.includes("error")
  ) {
    throw createHttpError(
      502,
      packageStatus ?? "Delhivery rejected the shipment request",
      packageInfo
    );
  }

  const waybill =
    readWaybill(packageInfo, ["waybill", "awb", "refno", "wayBill", "waybillno"]) ??
    readWaybill(
      typeof delhiveryResponse === "object" && delhiveryResponse
        ? (delhiveryResponse as Record<string, unknown>)
        : null,
      ["waybill", "awb", "upload_wbn", "consignment_no", "refno"]
    ) ??
    input.waybill;

  if (!waybill) {
    logger.error("Delhivery shipment response missing waybill", {
      orderItemId: orderItem.id,
      response: delhiveryResponse,
    });
    throw createHttpError(502, "Delhivery did not return a waybill number", delhiveryResponse);
  }

  const manifestUrl =
    (typeof delhiveryResponse.manifest_url === "string" && delhiveryResponse.manifest_url) ||
    (typeof packageInfo?.manifest === "string" && packageInfo.manifest) ||
    (typeof packageInfo?.label === "string" && packageInfo.label) ||
    null;

  const shipmentRecord = await prisma.$transaction(async (tx) => {
    const existing = await tx.shipment.findFirst({
      where: { orderItemId: orderItem.id },
    });
    if (existing) {
      throw createHttpError(409, "Shipment already exists for this order item");
    }

    const created = await tx.shipment.create({
      data: {
        orderId: orderItem.orderId,
        orderItemId: orderItem.id,
        trackingNumber: waybill,
        provider: "delhivery",
        courierName: "Delhivery",
        status: "label_created",
        labelUrl: manifestUrl,
      },
    });

    if (["pending", "paid"].includes(orderItem.order.status)) {
      await tx.order.update({
        where: { id: orderItem.orderId },
        data: { status: "processing" },
      });
    }

    return created;
  });

  return {
    shipment: {
      id: shipmentRecord.id,
      orderId: shipmentRecord.orderId,
      orderItemId: shipmentRecord.orderItemId,
      trackingNumber: shipmentRecord.trackingNumber ?? waybill,
      status: shipmentRecord.status,
      provider: shipmentRecord.provider,
      courierName: shipmentRecord.courierName,
      labelUrl: shipmentRecord.labelUrl,
      createdAt: shipmentRecord.createdAt.toISOString(),
    },
    delhivery: {
      status: packageStatus,
      remarks:
        typeof packageInfo?.remarks === "string"
          ? packageInfo.remarks
          : typeof packageInfo?.remark === "string"
          ? packageInfo.remark
          : null,
      waybill,
      manifestUrl,
      raw: delhiveryResponse,
    },
  };
}

export async function getShipmentTracking(
  waybill: string,
  lastEventOnly: boolean
): Promise<TrackingResult> {
  let response: Record<string, unknown>;
  try {
    response = await delhiveryClient.trackShipment(waybill);
  } catch (error) {
    if (error instanceof DelhiveryApiError) {
      logger.error("Delhivery tracking lookup failed", {
        status: error.status,
        details: error.details,
      });
      throw createHttpError(
        error.status === 401 ? 502 : error.status,
        "Unable to fetch tracking information from Delhivery",
        error.details
      );
    }
    throw error;
  }

  const shipmentData = Array.isArray(response.ShipmentData)
    ? response.ShipmentData
    : [];
  const shipment = (shipmentData[0] as Record<string, unknown> | undefined)?.Shipment as
    | Record<string, unknown>
    | undefined;

  const statusBlock = shipment?.Status as Record<string, unknown> | undefined;
  const statusText =
    typeof statusBlock?.Status === "string"
      ? statusBlock.Status
      : typeof statusBlock?.StatusText === "string"
      ? statusBlock.StatusText
      : null;
  const statusType =
    typeof statusBlock?.StatusType === "string"
      ? statusBlock.StatusType
      : typeof statusBlock?.StatusCode === "string"
      ? statusBlock.StatusCode
      : null;
  const statusDate =
    typeof statusBlock?.StatusDateTime === "string"
      ? statusBlock.StatusDateTime
      : typeof statusBlock?.StatusDate === "string"
      ? statusBlock.StatusDate
      : null;

  const scansRaw = (shipment?.Scans as Record<string, unknown> | undefined)?.ScanDetail;
  const scansArray = Array.isArray(scansRaw)
    ? scansRaw
    : scansRaw
    ? [scansRaw]
    : [];

  const events: TrackingEvent[] = scansArray
    .map((scan) => {
      if (!scan || typeof scan !== "object") {
        return null;
      }
      const record = scan as Record<string, unknown>;
      const scanStatus =
        (typeof record.Scan === "string" ? record.Scan : null) ??
        (typeof record.Status === "string" ? record.Status : null) ??
        (typeof record.ScanStatus === "string" ? record.ScanStatus : null);

      const scanDate =
        (typeof record.ScanDateTime === "string" ? record.ScanDateTime : null) ??
        (typeof record.ScanDate === "string"
          ? `${record.ScanDate} ${typeof record.ScanTime === "string" ? record.ScanTime : ""}`.trim()
          : null);

      const statusCode =
        (typeof record.StatusCode === "string" ? record.StatusCode : null) ??
        (typeof record.ScanType === "string" ? record.ScanType : null);

      const location =
        (typeof record.ScannedLocation === "string" ? record.ScannedLocation : null) ??
        (typeof record.ScanLocation === "string" ? record.ScanLocation : null);

      const remarks =
        (typeof record.Remarks === "string" ? record.Remarks : null) ??
        (typeof record.ScanRemark === "string" ? record.ScanRemark : null);

      const instructions =
        typeof record.Instructions === "string" ? record.Instructions : null;

      const entry: TrackingEvent = {
        status: scanStatus ?? "Update",
        code: statusCode,
        location,
        timestamp: scanDate ? toIsoDate(scanDate) : null,
        remarks,
        instructions,
      };

      return entry;
    })
    .filter((event): event is TrackingEvent => event !== null)
    .sort((a, b) => {
      if (!a.timestamp || !b.timestamp) {
        return 0;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  const fallbackStatus = events[0]?.status ?? "Status unavailable";
  const currentStatus: string = statusText ?? fallbackStatus;
  const currentStatusDate = statusDate ? toIsoDate(statusDate) : events[0]?.timestamp ?? null;
  const currentStatusCode: Nullable<string> = statusType ?? events[0]?.code ?? null;

  const latestEvent = events[0] ?? null;

  const normalizedShipmentStatus = normaliseShipmentStatus(
    currentStatus,
    currentStatusCode
  );

  const shipmentRecord = await prisma.shipment.findFirst({
    where: { trackingNumber: waybill },
    include: {
      order: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (shipmentRecord && shipmentRecord.status !== normalizedShipmentStatus) {
    await prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: shipmentRecord.id },
        data: {
          status: normalizedShipmentStatus,
          trackingNumber: waybill,
        },
      });

      if (normalizedShipmentStatus === "delivered") {
        await tx.order.update({
          where: { id: shipmentRecord.orderId },
          data: { status: "delivered" },
        });
      } else if (normalizedShipmentStatus === "out_for_delivery" || normalizedShipmentStatus === "in_transit") {
        if (["processing", "paid", "pending"].includes(shipmentRecord.order.status)) {
          await tx.order.update({
            where: { id: shipmentRecord.orderId },
            data: { status: "shipped" },
          });
        }
      } else if (normalizedShipmentStatus === "exception") {
        await tx.order.update({
          where: { id: shipmentRecord.orderId },
          data: { status: "processing" },
        });
      }
    });
  }

  return {
    waybill,
    currentStatus,
    currentStatusCode,
    currentStatusDate,
    events: lastEventOnly ? (latestEvent ? [latestEvent] : []) : events,
    raw: response,
  };
}
