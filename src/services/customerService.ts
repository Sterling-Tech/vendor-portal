import { get, post, patch, del, put } from './api';
import { buildQuery } from './vendormanagementservice';

const API_BASE_URL = process.env.REACT_APP_API_SAAS_PROD_URL || 'https://api.sterlingtechonline.com';

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
export interface CustomerForm {
  name: string;
  email: string;
  phone_number: string;
  address: string;

  customer_category: number;
  customer_class: number | null;
  metering_type: number;
  feeder_33: string;
  service_unit: string;
  postpaid_arrears: string;
  district: string;
  feeder: string;
  transformer: string;
  service_center: string;

  band: string;
  tariff: string;

  krn: string;
  ti: string;
  sgc: string;
  kct1: string;
  kct2: string;
}

export interface CustomerOption {
  id: number;
  name: string;
  description?: string;
}

export interface PaginatedCustomerResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Customer[];
}

export const fetchCustomers = (params?: {
  page?: number;
  account_status?: string;
  metering_type_id?: string;
  class_id?: string;
  category_id?: string;
  customer_id?: string;
}) =>
  get<PaginatedCustomerResponse>(`/customer/${buildQuery(params)}`);

export const fetchCustomerCategories = () =>
  get<CustomerOption[]>('/customer/category/');

export const fetchCustomerClasses = () =>
  get<CustomerOption[]>('/customer/class/');

export const fetchMeteringTypes = () =>
  get<CustomerOption[]>('/customer/metering-type/');

export const createCustomer = (payload: CustomerForm) =>
  post<Customer>('/customer/', payload);

export interface ValidateCustomerResponse {
  status: boolean;
  minimum_vend: string;
  customer: {
    name: string;
    phone_no: string;
    address: string;
    acc_no: string;
    old_acc_no: string;
    customer_category: string;
    meter_no: string;
    feeder: string;
    transformer: string;
    district_name: string;
    customer_class: string;
    tariff_rate: string;
    bill_status: string;
    metering_type: string;
    krn: string;
    ti: string;
    sgc: string;
    kct1: string;
    kct2: string;
    debt: string;
  };
}


export interface VendPaymentPayload {
  account_number: string;
  amount: string;
  reference: string;
  bill_type: "prepaid" | "postpaid";
  channel: string;
  payment_mode: string;
}

export interface VendTransactionResponse {
  transaction_reference: string;
  status: string;
  amount: string;
  debt: string;
  vat: string;
  token: string;
  units: string;
}

// const vendorTransactionRequest = async <T,>(
//   endpoint: string,
//   vendorToken: string,
//   options: RequestInit = {}
// ): Promise<T> => {
//   const baseUrl = API_BASE_URL.replace(/\/+$/, "");
//   const response = await fetch(`${baseUrl}${endpoint}`, {
//     ...options,
//     headers: {
//       Authorization: `Bearer ${vendorToken}`,
//       Accept: "application/json",
//       ...(options.body ? { "Content-Type": "application/json" } : {}),
//       ...options.headers,
//     },
//   });

//   const responseText = await response.text();

//   let data: any = {};

//   try {
//     data = responseText ? JSON.parse(responseText) : {};
//   } catch {
//     data = { message: responseText };
//   }

//   if (!response.ok) {
//     throw {
//       ...data,
//       status: response.status,
//       message:
//         data?.detail ||
//         data?.error ||
//         data?.message ||
//         `Transaction request failed (${response.status})`,
//     };
//   }

//   return data as T;
// };

const vendorTransactionRequest = async <T,>(
  endpoint: string,
  vendorToken: string,
  options: RequestInit = {}
): Promise<T> => {
  const baseUrl = API_BASE_URL.replace(/\/+$/, "");

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${vendorToken}`,
      Accept: "application/json",
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  const responseText = await response.text();

  let data: any = null;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!response.ok) {
    let backendMessage = "";

    if (Array.isArray(data)) {
      backendMessage = data.join(", ");
    } else if (typeof data === "string") {
      backendMessage = data;
    } else if (data && typeof data === "object") {
      backendMessage =
        data.detail ||
        data.error ||
        data.message ||
        data[0] ||
        Object.values(data)
          .flat()
          .filter(Boolean)
          .join(", ");
    }

    throw {
      status: response.status,
      message:
        backendMessage ||
        `Request failed with status ${response.status}`,
      error: data,
    };
  }

  return data as T;
};

export const fetchValidateCustomerBeforeVend = (
  accountNumber: string,
  vendorToken: string
) => {
  return vendorTransactionRequest<ValidateCustomerResponse>(
    `/transactions/validate/?account_number=${encodeURIComponent(
      accountNumber
    )}`,
    vendorToken,
    {
      method: "GET",
    }
  );
};

export const processVendPayment = (
  payload: VendPaymentPayload,
  vendorToken: string
) => {
  return vendorTransactionRequest<VendTransactionResponse>(
    "/transactions/pay/",
    vendorToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
};

export const requeryVendTransaction = (
  reference: string,
  vendorToken: string
) => {
  return vendorTransactionRequest<VendTransactionResponse>(
    `/transactions/requery/?reference=${encodeURIComponent(reference)}`,
    vendorToken,
    { method: "GET" }
  );
};
