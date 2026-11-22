const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Express 5 forwards errors thrown in async handlers here automatically
const errorHandler = (err, req, res, next) => {
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }
  if (err.code === 11000) {
    return res.status(400).json({ message: `${Object.keys(err.keyValue)} already exists` });
  }
  console.error(err);
  res.status(500).json({ message: "Server error" });
};

module.exports = { notFound, errorHandler };
