// Ejecuta TODA la batería de pruebas del backend.
//
// `helpers.main()` descubre y carga las suites `NN-*.test.js` en orden
// (00 → 14) antes de correrlas. No se requieren aquí para evitar que las
// pruebas se registren dos veces.
require("./helpers").main();
