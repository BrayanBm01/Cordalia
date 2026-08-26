function errorHandler(err, req, res, _next) {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
  });
}

module.exports = errorHandler;
