export interface CustomerTransaction {
  id: number;
  vendor?: {
    id?: number;
    email?: string;
    business_name?: string;
    account_status?: string;
    hierachy?: string;
  };

  transaction_ref?: string;
  token?: string;
  amount?: string;
  timestamp?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone_number?: string;
  account_number?: string;
  meter_number?: string;

  account_status?: string;
  status?: string;

  customer_category?: {
    id: number;
    name: string;
    description?: string;
  };

  customer_class?: {
    id: number;
    name: string;
    description?: string;
    category?: {
      id: number;
      name: string;
    };
  };

  metering_type?: {
    id: number;
    name: string;
    description?: string;
  };

  wallet?: {
    id: number;
    balance?: string;
    wallet_type?: {
      name?: string;
      description?: string;
    };
  };

  extra_info?: {
    address?: string;
    district?: string;
    feeder?: string;
    transformer?: string;
    service_center?: string;
    band?: string;
    postpaid_arrears?: string | null;
    service_unit?: string | null;
    feeder_33?: string | null;
    tariff?: string | null;
    krn?: string | null;
    ti?: string | null;
    sgc?: string | null;
    kct1?: string | null;
    kct2?: string | null;
  };

transactions?: CustomerTransaction[];
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  accountNumber: string;
  meterNumber: string;
  customerClass: string;
  category: string;
  meteringType: "Prepaid" | "Postpaid";
}

export type CustomerStatus = "active" | "inactive";