export const redirectAfterAuth = (locale: string): void => {
  window.location.assign(`/${locale}/overview`);
};
