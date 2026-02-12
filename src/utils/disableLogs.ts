if (process.env.NODE_ENV === 'production') {
  const noop = () => {};
  // Silencia logs de desenvolvimento em produção
  // Mantém apenas console.error e console.warn
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.trace = noop;
  console.warn = noop;  
}