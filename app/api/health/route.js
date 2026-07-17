export function GET() {
  return Response.json({
    service: "indipet-hrms-web",
    status: "ok",
    timestamp: new Date().toISOString()
  });
}
