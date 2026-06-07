import e from "express";

export default function handleSession(req: e.Request, res: e.Response) {
  return res.status(200).json({
    success: true,
    company: req.company,
  });
}
