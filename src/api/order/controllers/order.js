("use strict");

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const baseUrl = process.env.CLIENT_URL || "http://localhost:3000";

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    try {
      const { user } = ctx.state; // receive user state after jwt auth

      if (!user) throw new Error("User could not be properly authenticated");
      const { products, customerId } = ctx.request.body;

      // resolve all cart products
      const lineItems = await Promise.all(
        products.map(async (product) => {
          // match client cart product with db product
          const item = await strapi
            .service("api::product.product")
            .findOne(product.id);

          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: item.title,
              },
              unit_amount: item.price * 100, // dollar amount
            },
            quantity: product.quantity,
          };
        })
      );

      // establish checkout session
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        invoice_creation: {
          enabled: true,
        },
        success_url: `${baseUrl}?success=true`,
        cancel_url: `${baseUrl}?success=false`,
        line_items: lineItems,
        shipping_address_collection: {
          allowed_countries: ["US", "CA"],
        },
        payment_method_types: ["card"],
        customer: user.stripeCustomerId,
      });

      // store order in strapi collection
      await strapi.service("api::order.order").create({
        data: {
          stripeId: session.id,
          products,
          customer: customerId, // match relation of order and user with id
        },
      });

      return { stripeSession: session };
    } catch (error) {
      ctx.response.status = 500;
      return error;
    }
  },

  async createBillingPortal(ctx) {
    try {
      const { user } = ctx.state; // receive user state after jwt auth

      if (!user) throw new Error("User could not be properly authenticated");

      // establish billing session
      const stripeBillingPortalSession =
        await stripe.billingPortal.sessions.create({
          customer: user.stripeCustomerId,
          return_url: `${baseUrl}/`,
        });

      if (!stripeBillingPortalSession) {
        throw new Error("Could not create billing portal session");
      }

      return { billingPortalUrl: stripeBillingPortalSession.url };
    } catch (error) {
      ctx.response.status = 500;
      return error;
    }
  },
}));
