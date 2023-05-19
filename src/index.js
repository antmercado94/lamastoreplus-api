"use strict";

const stripe = require("stripe")(process.env.STRIPE_SECRET);

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/*{ strapi }*/) {
    strapi.db.lifecycles.subscribe({
      models: ["plugin::users-permissions.user"],
      // create a stripe customer after user creation
      async afterCreate(event) {
        const { result } = event;

        const { id: stripeCustomerId } = await stripe.customers.create({
          email: result.email,
          description: "Customer created from Strapi Registration",
        });

        if (!stripeCustomerId) throw new Error("Customer could not be created");

        // update with customer id
        await strapi.entityService.update(
          "plugin::users-permissions.user",
          result.id,
          {
            data: { stripeCustomerId },
          }
        );
      },
      // async beforeCreate(event) {
      //   // beforeCreate lifecycle
      // },
    });
  },
};
