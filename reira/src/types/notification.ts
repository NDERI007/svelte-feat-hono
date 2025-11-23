export interface OrderSharedNotification {
  type: "ORDER_SHARED";
  data: {
    id: string;
    payment_reference: string;
    shared_by: string;
  };
  timestamp: string;
}

export interface OrderNotification {
  type: "ORDER_CONFIRMED";
  data: {
    id: string;
    payment_reference: string;
    amount: number;
    phone_number: string;
  };
  timestamp: string;
}

export interface OrderRemovedNotification {
  type: "ORDER_REMOVED";
  data: {
    id: string;
  };
  timestamp: string;
}

export type Notification =
  | OrderNotification
  | OrderSharedNotification
  | OrderRemovedNotification;

export interface OutboxItem {
  id: string;
  action: "new" | "shared" | "removed";
  payload: Notification; // The full notification object
  channel: string; // The Supabase channel name
  createdAt: number;
  retryCount: number;
  lastError?: string;
}
