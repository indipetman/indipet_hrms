const API_BASE_URL = (process.env.NEXT_PUBLIC_HRMS_API_BASE_URL || "").replace(/\/$/, "");

export class HrmsApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "HrmsApiError";
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  if (!API_BASE_URL) {
    throw new HrmsApiError(
      "NEXT_PUBLIC_HRMS_API_BASE_URL is not configured.",
      0
    );
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new HrmsApiError(
      payload?.message || `Request failed with status ${response.status}.`,
      response.status,
      payload
    );
  }

  return payload;
}

function listResource(resource, query = {}) {
  const search = new URLSearchParams(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== "")
  );
  return request(`/${resource}${search.size ? `?${search}` : ""}`);
}

function createResource(resource, record) {
  return request(`/${resource}`, {
    method: "POST",
    body: JSON.stringify(record)
  });
}

function updateResource(resource, id, record) {
  return request(`/${resource}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(record)
  });
}

export const hrmsApi = {
  entities: {
    list: query => listResource("entities", query),
    create: record => createResource("entities", record),
    update: (id, record) => updateResource("entities", id, record)
  },
  locations: {
    list: query => listResource("locations", query),
    create: record => createResource("locations", record),
    update: (id, record) => updateResource("locations", id, record),
    operatingHours: locationId => listResource(`locations/${encodeURIComponent(locationId)}/operating-hours`),
    shiftPolicies: locationId => listResource(`locations/${encodeURIComponent(locationId)}/shift-policies`)
  },
  employees: {
    list: query => listResource("employees", query),
    create: record => createResource("employees", record),
    update: (id, record) => updateResource("employees", id, record)
  },
  rosters: {
    list: query => listResource("rosters", query),
    generate: input => request("/rosters/generate", {
      method: "POST",
      body: JSON.stringify(input)
    }),
    publish: rosterId => request(`/rosters/${encodeURIComponent(rosterId)}/publish`, {
      method: "POST"
    })
  }
};
