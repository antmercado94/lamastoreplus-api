module.exports = {
  routes: [
    {
      method: "GET",
      path: "/billing",
      handler: "order.createBillingPortal",
      config: {
        policies: [],
      },
    },
  ],
};
