export type Carrier = "UPS" | "USPS" | "FedEx" | "Amazon" | "DHL" | "Other";
export type PackageStatus = "exception" | "out_for_delivery" | "in_transit" | "shipped" | "delivered" | "ordered";

export type PackageItem = {
  id: string;
  carrier: Carrier;
  /** Last 4 of the tracking number only; the full number stays in the carrier link. */
  trackingLast4?: string;
  status: PackageStatus;
  /** Time of the email the status came from (not a carrier scan time). */
  statusAt: number;
  merchant: string;
  subject: string;
  /** Delivery date/estimate text quoted from the email, if any. */
  eta?: string;
  trackUrl?: string;
  emailUrl?: string;
  emails: number;
};

export type PackagesData = { packages: PackageItem[]; scannedEmails: number; lookbackDays: number };
