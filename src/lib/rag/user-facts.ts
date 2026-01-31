import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { MedusaContainer } from "@medusajs/framework/types";

export type UserFacts = {
    customer: {
        email: string;
        first_name?: string;
        last_name?: string;
    } | null;
    orders: Array<{
        id: string;
        display_id: number;
        status: string;
        created_at: string;
        total: number;
        currency_code: string;
        email?: string;
        payment_status?: string;
        fulfillment_status?: string;
        canceled_at?: string;
        shipping_address?: {
            first_name?: string;
            last_name?: string;
            address_1?: string;
            address_2?: string;
            city?: string;
            postal_code?: string;
            country_code?: string;
            province?: string;
        };
        billing_address?: {
            first_name?: string;
            last_name?: string;
            address_1?: string;
            city?: string;
            postal_code?: string;
            country_code?: string;
        };
        shipping_methods?: Array<{
            name: string;
            price: number;
        }>;
        items: Array<{
            title: string;
            quantity: number;
            unit_price?: number;
            subtotal?: number;
            variant_title?: string;
        }>;
    }>;
    addresses: Array<{
        id: string;
        first_name?: string;
        last_name?: string;
        address_1?: string;
        city?: string;
        postal_code?: string;
        country_code?: string;
    }>;
};

const USER_QUERY_PATTERNS = [
    /\bmy\s+(order|orders|purchase|purchases|address|addresses|account|profile)\b/i,
    /\bwhere\s+is\s+my\b/i,
    /\btrack(ing)?\s*(my)?\s*(order|package|shipment)\b/i,
    /\border\s*(#|number|status)\b/i,
    /\bdelivery\s+status\b/i,
    /\bshipping\s+(address|status)\b/i,
    /\bwhen\s+will\s+(my|it)\b/i,
    /\bcancel\s+(my\s+)?order\b/i,
    /\breturn\s+(my\s+)?order\b/i,
];

export function needsUserFacts(query: string): boolean {
    return USER_QUERY_PATTERNS.some((pattern) => pattern.test(query));
}

export async function fetchUserFacts(
    container: MedusaContainer,
    customerId: string
): Promise<UserFacts> {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const result: UserFacts = {
        customer: null,
        orders: [],
        addresses: [],
    };

    try {
        // Fetch customer info
        const { data: customers } = await query.graph({
            entity: "customer",
            fields: ["id", "email", "first_name", "last_name"],
            filters: { id: customerId },
        });

        if (customers && customers.length > 0) {
            const c = customers[0];
            result.customer = {
                email: c.email,
                first_name: c.first_name,
                last_name: c.last_name,
            };
        }

        // Fetch recent orders (last 5) with full details
        const { data: orders } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "display_id",
                "status",
                "created_at",
                "total",
                "currency_code",
                "email",
                "payment_status",
                "fulfillment_status",
                "canceled_at",
                "shipping_address.first_name",
                "shipping_address.last_name",
                "shipping_address.address_1",
                "shipping_address.address_2",
                "shipping_address.city",
                "shipping_address.postal_code",
                "shipping_address.country_code",
                "shipping_address.province",
                "billing_address.first_name",
                "billing_address.last_name",
                "billing_address.address_1",
                "billing_address.city",
                "billing_address.postal_code",
                "billing_address.country_code",
                "shipping_methods.name",
                "shipping_methods.price",
                "items.title",
                "items.quantity",
                "items.unit_price",
                "items.subtotal",
                "items.variant.title",
            ],
            filters: { customer_id: customerId },
            pagination: { take: 5, order: { created_at: "DESC" } },
        });

        if (orders) {
            result.orders = orders.map((o: any) => ({
                id: o.id,
                display_id: o.display_id,
                status: o.status,
                created_at: o.created_at,
                total: o.total,
                currency_code: o.currency_code,
                email: o.email,
                payment_status: o.payment_status,
                fulfillment_status: o.fulfillment_status,
                canceled_at: o.canceled_at,
                shipping_address: o.shipping_address ? {
                    first_name: o.shipping_address.first_name,
                    last_name: o.shipping_address.last_name,
                    address_1: o.shipping_address.address_1,
                    address_2: o.shipping_address.address_2,
                    city: o.shipping_address.city,
                    postal_code: o.shipping_address.postal_code,
                    country_code: o.shipping_address.country_code,
                    province: o.shipping_address.province,
                } : undefined,
                billing_address: o.billing_address ? {
                    first_name: o.billing_address.first_name,
                    last_name: o.billing_address.last_name,
                    address_1: o.billing_address.address_1,
                    city: o.billing_address.city,
                    postal_code: o.billing_address.postal_code,
                    country_code: o.billing_address.country_code,
                } : undefined,
                shipping_methods: (o.shipping_methods || []).map((sm: any) => ({
                    name: sm.name,
                    price: sm.price,
                })),
                items: (o.items || []).map((i: any) => ({
                    title: i.title,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    subtotal: i.subtotal,
                    variant_title: i.variant?.title,
                })),
            }));
        }

        // Fetch addresses
        const { data: addresses } = await query.graph({
            entity: "customer_address",
            fields: [
                "id",
                "first_name",
                "last_name",
                "address_1",
                "city",
                "postal_code",
                "country_code",
            ],
            filters: { customer_id: customerId },
        });

        if (addresses) {
            result.addresses = addresses.map((a: any) => ({
                id: a.id,
                first_name: a.first_name,
                last_name: a.last_name,
                address_1: a.address_1,
                city: a.city,
                postal_code: a.postal_code,
                country_code: a.country_code,
            }));
        }
    } catch (error) {
        console.error("Error fetching user facts:", error);
    }

    return result;
}

export function formatUserFactsForPrompt(facts: UserFacts): string {
    const parts: string[] = [];

    if (facts.customer) {
        parts.push(
            `Customer: ${facts.customer.first_name || ""} ${facts.customer.last_name || ""} (${facts.customer.email})`
        );
    }

    if (facts.orders.length > 0) {
        parts.push("\nRecent Orders:");
        for (const order of facts.orders) {
            const orderLines: string[] = [];
            
            // Basic order info
            orderLines.push(`- Order #${order.display_id}:`);
            orderLines.push(`  Status: ${order.status}`);
            orderLines.push(`  Date: ${new Date(order.created_at).toLocaleDateString()}`);
            orderLines.push(`  Total: ${order.total} ${order.currency_code}`);
            
            // Payment and fulfillment status
            if (order.payment_status) {
                orderLines.push(`  Payment: ${order.payment_status}`);
            }
            if (order.fulfillment_status) {
                orderLines.push(`  Fulfillment: ${order.fulfillment_status}`);
            }
            if (order.canceled_at) {
                orderLines.push(`  Canceled: ${new Date(order.canceled_at).toLocaleDateString()}`);
            }
            
            // Shipping address
            if (order.shipping_address) {
                const addr = order.shipping_address;
                orderLines.push(
                    `  Shipping to: ${addr.first_name || ""} ${addr.last_name || ""}, ${addr.address_1 || ""}${addr.address_2 ? ", " + addr.address_2 : ""}, ${addr.city || ""} ${addr.postal_code || ""}, ${addr.country_code || ""}`
                );
            }
            
            // Shipping method
            if (order.shipping_methods && order.shipping_methods.length > 0) {
                const sm = order.shipping_methods[0];
                orderLines.push(`  Shipping method: ${sm.name} (${sm.price} ${order.currency_code})`);
            }
            
            // Items
            orderLines.push("  Items:");
            for (const item of order.items) {
                const variant = item.variant_title ? ` (${item.variant_title})` : "";
                const price = item.unit_price ? ` @ ${item.unit_price} each` : "";
                orderLines.push(`    - ${item.title}${variant} x${item.quantity}${price}`);
            }
            
            parts.push(orderLines.join("\n"));
        }
    }

    if (facts.addresses.length > 0) {
        parts.push("\nSaved Addresses:");
        for (const addr of facts.addresses) {
            parts.push(
                `- ${addr.first_name || ""} ${addr.last_name || ""}, ${addr.address_1 || ""}, ${addr.city || ""} ${addr.postal_code || ""}, ${addr.country_code || ""}`
            );
        }
    }

    return parts.join("\n");
}
