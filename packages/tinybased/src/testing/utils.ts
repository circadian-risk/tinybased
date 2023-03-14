/**
 * Utility to wait in an asynchronous test to allow for uncontrolled asynchronous data propagation
 */
export const waitAMoment = async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
};
