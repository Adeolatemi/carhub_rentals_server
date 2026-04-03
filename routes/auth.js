import express from "express";
const router = express.Router();

router.post("/signup", (req, res) => {
  // handle signup logic
  res.json({ message: "Signup successful" });
});

router.post("/login", (req, res) => {
  // handle login logic
  res.json({ message: "Login successful" });
});

export default router;