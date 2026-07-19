/* Migrated from hrms_dashboard_nav_visual.html. */
const attendanceRecords = [
      { id: "IPL101-EMP014", name: "Meera Roy", initials: "MR", location: "Lake Gardens", shift: "Opening 10:30-19:30", checkIn: "10:24", checkOut: "-", status: "Present" },
      { id: "SCP102-EMP022", name: "Subham Sen", initials: "SS", location: "Lake Gardens", shift: "Closing 12:30-21:30", checkIn: "12:42", checkOut: "-", status: "Late" },
      { id: "SCP102-EMP026", name: "Debjit Mitra", initials: "DM", location: "Lake Gardens", shift: "Opening 10:30-19:30", checkIn: "10:27", checkOut: "-", status: "Present" },
      { id: "SCP102-EMP031", name: "Tania Biswas", initials: "TB", location: "Lake Gardens", shift: "Closing 12:30-21:30", checkIn: "-", checkOut: "-", status: "Leave" },
      { id: "IPL101-EMP003", name: "Ananya Ghosh", initials: "AG", location: "Corporate HQ", shift: "General 10:00-19:00", checkIn: "09:54", checkOut: "-", status: "Present" },
      { id: "IPL101-EMP009", name: "Rohan Dutta", initials: "RD", location: "Corporate HQ", shift: "General 10:00-19:00", checkIn: "-", checkOut: "-", status: "Absent" },
      { id: "PCP103-EMP006", name: "Priya Paul", initials: "PP", location: "Newtown", shift: "Opening 10:30-19:30", checkIn: "10:19", checkOut: "-", status: "Present" },
      { id: "PCP103-EMP011", name: "Amit Das", initials: "AD", location: "Newtown", shift: "-", checkIn: "-", checkOut: "-", status: "Weekly Off" }
    ];

    const keyholderEmployees = [
      { id: "SCP102-EMP022", name: "Subham Sen", locationId: "SCP102-LKG203", status: "Active", keyholderEligible: true },
      { id: "SCP102-EMP026", name: "Debjit Mitra", locationId: "SCP102-LKG203", status: "Active", keyholderEligible: true },
      { id: "SCP102-EMP031", name: "Tania Biswas", locationId: "SCP102-LKG203", status: "Active", keyholderEligible: false },
      { id: "SCP102-EMP041", name: "Riya Saha", locationId: "SCP102-DSP202", status: "Active", keyholderEligible: true },
      { id: "SCP102-EMP042", name: "Abir Nandi", locationId: "SCP102-DSP202", status: "Active", keyholderEligible: true },
      { id: "PCP103-EMP006", name: "Priya Paul", locationId: "PCP103-NTW204", status: "Active", keyholderEligible: true },
      { id: "PCP103-EMP011", name: "Amit Das", locationId: "PCP103-NTW204", status: "Active", keyholderEligible: true },
      { id: "HPR104-EMP017", name: "Nandita Roy", locationId: "HPR104-RJT205", status: "Active", keyholderEligible: true },
      { id: "HPR104-EMP018", name: "Sourav Pal", locationId: "HPR104-RJT205", status: "Active", keyholderEligible: true },
      { id: "IPL101-EMP003", name: "Ananya Ghosh", locationId: "IPL101-SLT201", status: "Active", keyholderEligible: true },
      { id: "IPL101-EMP014", name: "Meera Roy", locationId: "IPL101-SLT201", status: "Active", keyholderEligible: true }
    ];

    const statusClass = {
      "Present": "green",
      "Approved": "green",
      "Active": "green",
      "Late": "amber",
      "Pending": "amber",
      "Leave": "blue",
      "Posted": "blue",
      "Absent": "red",
      "Rejected": "red",
      "Draft": "grey",
      "Weekly Off": "grey",
      "Inactive": "grey",
      "Override": "purple",
      "Ready": "green",
      "Valid": "green",
      "Configured": "green",
      "Completed": "green",
      "Missing Services": "amber",
      "Missing Hours": "amber",
      "In Progress": "blue",
      "Blocked": "red",
      "Not Generated": "grey",
      "Needs Review": "amber",
      "Ready to Publish": "blue",
      "Published": "green",
      "Superseded": "grey",
      "Cancelled": "red",
      "Open Slots": "amber",
      "Leave Conflict": "amber",
      "Keyholder Missing": "red",
      "Skill Gap": "amber"
    };

    const subLocations = [
      {
        id: "SCP102-LKG203",
        name: "Indipet Care Lake Gardens",
        listName: "Lake Gardens Store",
        parent: "South Corona Pet Care",
        parentCode: "SCP102",
        state: "West Bengal",
        type: "Retail Store",
        status: "Active",
        readiness: 82,
        readinessLabel: "Ready",
        readinessTone: "ready",
        officialHours: "11:00 AM - 09:00 PM",
        operationalHours: "10:30 AM - 09:30 PM",
        closedDay: null,
        services: [
          ["SRV-GRM", "Grooming", "Appointment", "Active"],
          ["SRV-CLN", "Clinic", "Appointment", "Active"],
          ["SRV-RTL", "Product Sales", "Walk-in", "Active"]
        ],
        deliveryZones: [
          ["LKG-DZ01", "Lake Gardens Primary", "5 km", "6 PIN codes", "Active"],
          ["LKG-DZ02", "South Kolkata Extended", "9 km", "11 PIN codes", "Draft"]
        ],
        shifts: [
          ["SFP1404", "Opening Shift", "10:30 AM - 07:30 PM", "4", "Rotational", "Active"],
          ["SFP1405", "Closing Shift", "12:30 PM - 09:30 PM", "4", "Rotational", "Active"]
        ]
      },
      {
        id: "SCP102-DSP202",
        name: "Deshapriya Park Store",
        listName: "Deshapriya Park Store",
        parent: "South Corona Pet Care",
        parentCode: "SCP102",
        state: "West Bengal",
        type: "Retail Store",
        status: "Active",
        readiness: 74,
        readinessLabel: "Missing Services",
        readinessTone: "attention",
        officialHours: "11:00 AM - 09:00 PM",
        operationalHours: "10:30 AM - 09:30 PM",
        closedDay: null,
        services: [
          ["SRV-RTL", "Product Sales", "Walk-in", "Active"],
          ["SRV-GRM", "Grooming", "Appointment", "Draft"]
        ],
        deliveryZones: [["DSP-DZ01", "Deshapriya Park Primary", "6 km", "8 PIN codes", "Active"]],
        shifts: [
          ["SFP1402", "Opening Shift", "10:30 AM - 07:30 PM", "4", "Rotational", "Active"],
          ["SFP1403", "Closing Shift", "12:30 PM - 09:30 PM", "4", "Rotational", "Active"]
        ]
      },
      {
        id: "PCP103-NTW204",
        name: "Newtown Store",
        listName: "Newtown Store",
        parent: "Pets & Co Partnership Firm",
        parentCode: "PCP103",
        state: "West Bengal",
        type: "Retail Store",
        status: "Draft",
        readiness: 58,
        readinessLabel: "Setup Draft",
        readinessTone: "attention",
        officialHours: "11:00 AM - 09:00 PM",
        operationalHours: "10:30 AM - 09:30 PM",
        closedDay: null,
        services: [["SRV-RTL", "Product Sales", "Walk-in", "Draft"]],
        deliveryZones: [],
        shifts: [
          ["SFP1406", "Opening Shift", "10:30 AM - 07:30 PM", "4", "Rotational", "Draft"],
          ["SFP1407", "Closing Shift", "12:30 PM - 09:30 PM", "4", "Rotational", "Draft"]
        ]
      },
      {
        id: "HPR104-RJT205",
        name: "Rajarhat Store",
        listName: "Rajarhat Store",
        parent: "Happy Paws Retail Pvt Ltd",
        parentCode: "HPR104",
        state: "West Bengal",
        type: "Retail Store",
        status: "Active",
        readiness: 91,
        readinessLabel: "Ready",
        readinessTone: "ready",
        officialHours: "11:00 AM - 09:00 PM",
        operationalHours: "10:30 AM - 09:30 PM",
        closedDay: null,
        services: [
          ["SRV-RTL", "Product Sales", "Walk-in", "Active"],
          ["SRV-GRM", "Grooming", "Appointment", "Active"]
        ],
        deliveryZones: [["RJT-DZ01", "Rajarhat Primary", "7 km", "9 PIN codes", "Active"]],
        shifts: [
          ["SFP1408", "Opening Shift", "10:30 AM - 07:30 PM", "4", "Rotational", "Active"],
          ["SFP1409", "Closing Shift", "12:30 PM - 09:30 PM", "4", "Rotational", "Active"]
        ]
      },
      {
        id: "IPL101-SLT201",
        name: "Indipet Corporate HQ",
        listName: "Corporate HQ",
        parent: "Indipet Private Limited",
        parentCode: "IPL101",
        state: "West Bengal",
        type: "Head Office",
        status: "Active",
        readiness: 96,
        readinessLabel: "Ready",
        readinessTone: "ready",
        officialHours: "10:00 AM - 07:00 PM",
        operationalHours: "10:00 AM - 07:00 PM",
        closedDay: "Sunday",
        services: [],
        deliveryZones: [],
        shifts: [["SFP1401", "General Office Shift", "10:00 AM - 07:00 PM", "6", "Sunday", "Active"]]
      }
    ];

    const parentEntities = {
      IPL101: "Indipet Private Limited",
      SCP102: "South Corona Pet Care",
      PCP103: "Pets & Co Partnership Firm",
      HPR104: "Happy Paws Retail Private Limited"
    };

    const existingLocationRecords = {
      "IPL101-SLT201": {
        location_id: "IPL101-SLT201",
        parent_entity_id: "IPL101",
        location_name: "Indipet Corporate HQ",
        brand_flag: "Indipet HQ",
        location_type: "office",
        address_line1: "12th Floor, Indipet Corporate Office, Salt Lake Sector V",
        city: "Kolkata",
        pincode: "700091",
        state: "West Bengal",
        state_code: "",
        latitude: "22.5754",
        longitude: "88.4798",
        phone: "9007000101",
        email: "hq.office@indipet.test",
        cost_centre_code: "CC-HQ-KOL-001",
        area_manager_id: "",
        primary_keyholder_id: "",
        backup_keyholder_id: "",
        onboarding_status: "completed",
        status: "active"
      },
      "SCP102-DSP202": {
        location_id: "SCP102-DSP202",
        parent_entity_id: "SCP102",
        location_name: "Indipet Deshapriya Park Store",
        brand_flag: "Indipet Rashbehari",
        location_type: "store",
        address_line1: "166A, Sarat Bose Road, Near Deshapriya Park",
        city: "Kolkata",
        pincode: "700029",
        state: "West Bengal",
        state_code: "",
        latitude: "22.5177",
        longitude: "88.3524",
        phone: "9123925682",
        email: "deshapriya@indipet.test",
        cost_centre_code: "CC-FRPROP-DSP-001",
        area_manager_id: "",
        primary_keyholder_id: "",
        backup_keyholder_id: "",
        onboarding_status: "completed",
        status: "active"
      },
      "SCP102-LKG203": {
        location_id: "SCP102-LKG203",
        parent_entity_id: "SCP102",
        location_name: "Indipet Lake Gardens Store",
        brand_flag: "Indipet Care Lake Gardens",
        location_type: "store",
        address_line1: "48 Lake Gardens Road",
        city: "Kolkata",
        pincode: "700045",
        state: "West Bengal",
        state_code: "",
        latitude: "22.5057",
        longitude: "88.3499",
        phone: "9007010602",
        email: "lakegardens@indipet.test",
        cost_centre_code: "CC-FRPROP-LKD-002",
        area_manager_id: "",
        primary_keyholder_id: "",
        backup_keyholder_id: "",
        onboarding_status: "in_progress",
        status: "active"
      },
      "PCP103-NTW204": {
        location_id: "PCP103-NTW204",
        parent_entity_id: "PCP103",
        location_name: "Indipet Newtown AC Block Store",
        brand_flag: "Indipet Newtown",
        location_type: "store",
        address_line1: "Shop I & II AC89, Street No. 32, Action Area I",
        city: "North 24 Parganas",
        pincode: "700156",
        state: "West Bengal",
        state_code: "",
        latitude: "22.5799",
        longitude: "88.4697",
        phone: "7003937998",
        email: "newtown@indipet.test",
        cost_centre_code: "CC-FRPART-NTW-001",
        area_manager_id: "",
        primary_keyholder_id: "",
        backup_keyholder_id: "",
        onboarding_status: "completed",
        status: "active"
      },
      "HPR104-RJT205": {
        location_id: "HPR104-RJT205",
        parent_entity_id: "HPR104",
        location_name: "Indipet Rajarhat Store",
        brand_flag: "Indipet Rajarhat",
        location_type: "store",
        address_line1: "Ground Floor, City Centre Mall, Rajarhat Main Road",
        city: "Kolkata",
        pincode: "700157",
        state: "West Bengal",
        state_code: "",
        latitude: "22.6236",
        longitude: "88.4504",
        phone: "9007000203",
        email: "rajarhat@indipet.test",
        cost_centre_code: "CC-FRCOMP-RJT-001",
        area_manager_id: "",
        primary_keyholder_id: "",
        backup_keyholder_id: "",
        onboarding_status: "pending",
        status: "active"
      }
    };

    const weekDays = [
      { dayOfWeek: 1, dayName: "Monday" },
      { dayOfWeek: 2, dayName: "Tuesday" },
      { dayOfWeek: 3, dayName: "Wednesday" },
      { dayOfWeek: 4, dayName: "Thursday" },
      { dayOfWeek: 5, dayName: "Friday" },
      { dayOfWeek: 6, dayName: "Saturday" },
      { dayOfWeek: 7, dayName: "Sunday" }
    ];

    function displayTimeTo24Hour(value) {
      const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return "";
      let hour = Number(match[1]);
      const minute = match[2];
      const period = match[3].toUpperCase();
      if (period === "AM" && hour === 12) hour = 0;
      if (period === "PM" && hour !== 12) hour += 12;
      return `${String(hour).padStart(2, "0")}:${minute}`;
    }

    function displayRangeToTimes(value) {
      const parts = String(value || "").split(" - ");
      return {
        open: displayTimeTo24Hour(parts[0]),
        close: displayTimeTo24Hour(parts[1])
      };
    }

    function buildOperatingHourRecords(location) {
      const official = displayRangeToTimes(location.officialHours);
      const operational = displayRangeToTimes(location.operationalHours);
      const configured = location.hoursConfigured !== false && official.open && official.close && operational.open && operational.close;
      return weekDays.map(day => ({
        dayOfWeek: day.dayOfWeek,
        dayName: day.dayName,
        isOpen: Boolean(configured && location.closedDay !== day.dayName),
        officialOpen: configured ? official.open : "",
        officialClose: configured ? official.close : "",
        operationalOpen: configured ? operational.open : "",
        operationalClose: configured ? operational.close : ""
      }));
    }

    subLocations.forEach(location => {
      location.record = { ...existingLocationRecords[location.id] };
      location.hoursConfigured = true;
      location.operatingHoursRecords = buildOperatingHourRecords(location);
    });

    const pageConfig = {
      "entity-master": { title: "Entity Master", parent: "Organization", description: "Manage Indipet HQ and franchisee legal entities, constitutions and business roles.", action: "Add New Entity", icon: "plus", labels: ["Entities", "Franchisees", "Active Locations"], values: ["4", "3", "5"], columns: ["Entity ID", "Legal Name", "Constitution", "Role", "Status"], rows: [["IPL101", "Indipet Private Limited", "Company", "HQ", "Active"], ["SCP102", "South Corona Pet Care", "Proprietorship", "Franchisee", "Active"], ["PCP103", "Pets & Co Partnership Firm", "Partnership", "Franchisee", "Active"], ["HPR104", "Happy Paws Retail Pvt Ltd", "Company", "Franchisee", "Active"]] },
      "location-master": { title: "Location Master", parent: "Organization", description: "Maintain office and store locations, operating status, parent entity and service readiness.", action: "Add Location", icon: "map-pin", labels: ["Locations", "Stores", "HQ Offices"], values: ["5", "4", "1"], columns: ["Location ID", "Location", "Parent Entity", "Type", "Status"], rows: [["IPL101-SLT201", "Corporate HQ", "IPL101", "Office", "Active"], ["SCP102-DSP202", "Deshapriya Park", "SCP102", "Store", "Active"], ["SCP102-LKG203", "Indipet Care Lake Gardens", "SCP102", "Store", "Active"], ["PCP103-NTW204", "Newtown", "PCP103", "Store", "Active"], ["HPR104-RJT205", "Rajarhat", "HPR104", "Store", "Pending"]] },
      "department-master": genericPage("Department Master", "Organization", "Manage functional departments used by employees, services and reporting.", "Add Department", ["Departments", "Employees Mapped", "Service Linked"], ["8", "42", "4"], ["Department ID", "Department", "Head", "Location Scope", "Status"]),
      "designation-master": genericPage("Designation Master", "Organization", "Control job titles, grade authority, keyholder eligibility and override level.", "Add Designation", ["Designations", "Keyholder Eligible", "Override Enabled"], ["16", "4", "3"], ["Code", "Designation", "Grade Code", "Keyholder", "Status"]),
      "service-master": genericPage("Service Master", "Organization", "Define services and the skills or departments required to operate them.", "Add Service", ["Services", "Bookable", "Active Locations"], ["6", "4", "4"], ["Service Code", "Service", "Department", "Staff Requirement", "Status"]),
      "employee-master": { title: "Employee Master", parent: "Employees", description: "View the full employee database, profile completion status, employment details, hierarchy, location and access role from one workspace.", action: "Add Employee", icon: "user-plus", labels: ["Total Employees", "Profile Complete", "Needs Review"], values: ["42", "35", "7"], columns: ["Employee ID", "Employee", "Location", "Designation", "Profile Completion", "Status"], rows: [["IPL101-EMP014", "Meera Roy", "Lake Gardens", "Store Manager", "Complete", "Active"], ["SCP102-EMP022", "Subham Sen", "Lake Gardens", "Assistant Manager", "Complete", "Active"], ["SCP102-EMP026", "Debjit Mitra", "Lake Gardens", "Senior Groomer", "Certificate Review", "Active"], ["SCP102-EMP031", "Tania Biswas", "Lake Gardens", "Groomer", "Probation Active", "Active"], ["SCP102-CON002", "Dr Arjun Lahiri", "Lake Gardens", "Veterinary Doctor", "Review", "Active"]] },
      "employee-category": genericPage("Employee Category", "Employees", "Maintain statutory skilled, semi-skilled and unskilled employee classifications.", "Add Category", ["Categories", "Employees Mapped", "Wage Rules"], ["3", "39", "3"], ["Category Code", "Category", "Skill Class", "Employees", "Status"]),
      "skills-certifications": genericPage("Skills & Certifications", "Employees", "Maintain verified employee capabilities used by service booking and roster eligibility.", "Add Skill", ["Skill Records", "Verified", "Expiring Soon"], ["29", "24", "3"], ["Employee", "Skill", "Level", "Valid Until", "Status"]),
      "shift-preferences": genericPage("Shift Preferences", "Employees", "Manage default shift mode and temporary employee scheduling restrictions.", "Add Preference", ["Flexible", "Fixed Default", "Temporary Rules"], ["31", "8", "3"], ["Employee", "Mode", "Default Shift", "Effective Until", "Status"]),
      "transfers": genericPage("Transfer History", "Employees", "Review effective-dated employee movement across locations and entities.", "Create Transfer", ["Transfers", "Pending", "This Month"], ["8", "1", "2"], ["Employee", "From", "To", "Effective Date", "Status"]),
      "leave-requests": genericPage("Leave Requests", "Leave Management", "Review employee leave requests with balance, eligibility and coverage checks.", "New Request", ["Pending", "Approved Today", "Coverage Blocks"], ["4", "3", "1"], ["Request ID", "Employee", "Leave Type", "Dates", "Status"]),
      "leave-type-master": genericPage("Leave Type Master", "Leave Management", "Manage CL, SL, EL, CO, LOP, maternity and paternity leave definitions.", "Add Leave Type", ["Leave Types", "Paid", "Event Based"], ["7", "6", "1"], ["Code", "Leave Type", "Paid", "Accrual Type", "Status"]),
      "leave-policy": genericPage("Leave Policy", "Leave Management", "Configure the financial-year leave wrapper and its operational controls.", "Create Policy", ["Policies", "Active", "Assigned Employees"], ["1", "1", "42"], ["Policy ID", "Policy", "Financial Year", "Variants", "Status"]),
      "policy-variants": genericPage("Policy Variants", "Leave Management", "Define entitlement behaviour for stores, HQ, probation and contractors.", "Add Variant", ["Variants", "Default", "Special Groups"], ["4", "1", "3"], ["Variant Code", "Variant Name", "Applicable To", "Employees", "Status"]),
      "policy-assignments": genericPage("Policy Assignments", "Leave Management", "Resolve which effective policy variant applies to each group or employee.", "Add Assignment", ["Assignments", "Employee Override", "Conflicts"], ["12", "2", "0"], ["Assignment ID", "Target Type", "Target", "Variant", "Status"]),
      "holiday-calendar": genericPage("Holiday Calendar", "Leave Management", "Maintain the uniform West Bengal calendar and closed holiday decisions.", "Add Holiday", ["FY Holidays", "Store Closed", "CO Eligible"], ["12", "2", "12"], ["Date", "Holiday", "Scope", "Store Closed", "Status"]),
      "operating-hours": genericPage("Operating Hours", "Shift & Roster", "Manage official and operational hours for offices and retail stores.", "Add Hours", ["Locations", "Open Today", "Closed Today"], ["5", "5", "0"], ["Location", "Official Hours", "Operational Hours", "Week Off", "Status"]),
      "shift-policy": genericPage("Shift Policy", "Shift & Roster", "Configure shift timing, required staff, keyholder and weekly-off rules.", "Add Shift Policy", ["Policies", "Store Shifts", "HQ Shifts"], ["9", "8", "1"], ["Policy ID", "Shift", "Location", "Timing", "Status"]),
      "roster": genericPage("Roster Control Center", "Roster", "Overview of all locations and their roster status.", "Generate Roster", ["Total Locations", "Published Rosters", "Draft Rosters", "Open Slots", "Needs Review"], ["5", "2", "1", "28", "2"], ["Location", "Roster Period", "Roster Version", "Roster Status", "Filled Slots", "Open Slots", "Conflicts", "Keyholder Coverage", "Last Updated"]),
      "roster-board-menu": genericPage("Roster Board", "Shift & Roster", "Open a location roster from the Roster Control Center.", "Open Board", ["Locations", "Published", "Needs Review"], ["5", "2", "1"], ["Location", "Roster Period", "Version", "Status", "Action"]),
      "roster-slots": genericPage("Open Slots", "Shift & Roster", "Review unassigned roster requirements created during roster generation.", "Add Slot", ["Open Slots", "Skill Gaps", "Keyholder Gaps"], ["28", "4", "1"], ["Date", "Location", "Shift", "Required Skill", "Status"]),
      "roster-history": genericPage("Roster History", "Shift & Roster", "Review immutable roster versions, overrides, approvals and publication events.", "Export History", ["Versions", "Overrides", "Superseded"], ["14", "3", "4"], ["Version", "Location", "Changed By", "Published At", "Status"]),
      "attendance-list": genericPage("Attendance List", "Attendance", "Review raw attendance, roster linkage, computation and final payable status.", "Add Attendance", ["Present", "Late", "Absent"], ["37", "2", "1"], ["Employee", "Location", "Shift", "Hours", "Status"]),
      "regularization": genericPage("Regularization Requests", "Attendance", "Approve missing punch and attendance correction requests with evidence.", "New Request", ["Pending", "Approved Today", "Rejected"], ["3", "2", "1"], ["Request ID", "Employee", "Issue", "Requested At", "Status"]),
      "shift-exceptions": genericPage("Shift Exceptions", "Attendance", "Monitor late, early exit, missed punch and roster mismatch exceptions.", "Review Exceptions", ["Open", "Critical", "Resolved Today"], ["5", "1", "7"], ["Employee", "Exception", "Roster Slot", "Detected At", "Status"]),
      "co-ledger": genericPage("CO Ledger", "Attendance", "Track compensatory-off credits, use, expiry and attendance source.", "Manual Credit", ["Available Units", "Expiring Soon", "Used This Month"], ["18", "4", "6"], ["Employee", "Entry Type", "Units", "Expiry", "Status"]),
      "attendance-reports": genericPage("Attendance Reports", "Attendance", "Prepare location, employee and exception reports from approved decisions.", "Generate Report", ["Saved Reports", "Scheduled", "Last Run"], ["8", "2", "Today"], ["Report", "Scope", "Period", "Owner", "Status"]),
      "salary-structure": genericPage("Salary Structure", "Payroll & Compliance", "Maintain grade-wise salary components and effective-dated structures.", "Add Structure", ["Structures", "Employees Mapped", "Pending Approval"], ["6", "39", "2"], ["Structure", "Grade", "Basic", "Gross", "Status"]),
      "payroll-period": genericPage("Payroll Period", "Payroll & Compliance", "Control payroll month, cut-off, processing and finalisation status.", "Open Period", ["Current Period", "Exceptions", "Cut-off"], ["June 2026", "7", "25 Jun"], ["Period", "Employee Count", "Cut-off", "Run Status", "Status"]),
      "payroll-run": genericPage("Payroll Run", "Payroll & Compliance", "Process authoritative attendance, leave, compensation and compliance inputs.", "Run Payroll", ["Employees", "Ready", "Blocked"], ["42", "35", "7"], ["Run ID", "Period", "Employees", "Gross Payroll", "Status"]),
      "minimum-wage": genericPage("Minimum Wage", "Payroll & Compliance", "Maintain West Bengal minimum wage controls by statutory category.", "Add Wage Rule", ["Rules", "Categories", "Breaches"], ["3", "3", "0"], ["State", "Category", "Effective From", "Monthly Wage", "Status"]),
      "state-compliance": genericPage("State Compliance", "Payroll & Compliance", "Manage state-wise PT, ESIC and other payroll applicability rules.", "Add Rule", ["States", "Active Rules", "Pending Review"], ["1", "4", "0"], ["State", "Rule", "Effective From", "Owner", "Status"]),
      "approvals": genericPage("Approval Queue", "Audit & Administration", "Review leave, roster, attendance and payroll decisions awaiting authority.", "Review Queue", ["Pending", "High Priority", "Due Today"], ["11", "3", "5"], ["Request", "Module", "Submitted By", "Age", "Status"]),
      "audit-log": genericPage("Audit Log", "Audit & Administration", "Search actor, timestamp, reason and version history across HRMS modules.", "Export Audit", ["Events Today", "Overrides", "High Risk"], ["64", "3", "1"], ["Timestamp", "Actor", "Module", "Action", "Status"]),
      "role-manager": genericPage("Role Master", "Organization", "Manage application permissions separately from designation grade authority.", "Add Role", ["Roles", "Permission Sets", "Users"], ["7", "14", "12"], ["Role", "Scope", "Users", "Last Changed", "Status"]),
      "system-settings": genericPage("System Settings", "Audit & Administration", "Manage controlled configuration, notifications and integration behaviour.", "Add Setting", ["Settings", "Integrations", "Warnings"], ["24", "3", "1"], ["Setting", "Category", "Value", "Changed By", "Status"]),
      "support": genericPage("Help & Support", "Control", "Find process guidance, operating handbooks and developer support resources.", "Create Ticket", ["Open Tickets", "Knowledge Articles", "System Status"], ["2", "18", "Active"], ["Resource", "Category", "Updated", "Owner", "Status"])
    };

    function resetHrmsPrototypeTestData() {
      attendanceRecords.length = 0;
      keyholderEmployees.length = 0;
      Object.values(pageConfig).forEach(config => {
        config.values = config.labels.map(() => "0");
        config.rows = [];
      });
      pageConfig["location-master"].values = ["0", "0", "0"];
      pageConfig["roster"].values = ["0", "0", "0", "0", "0"];
      pageConfig["employee-master"].values = ["0", "0", "0"];
    }

    resetHrmsPrototypeTestData();

    function genericPage(title, parent, description, action, labels, values, columns) {
      const statuses = ["Active", "Approved", "Pending", "Draft", "Inactive"];
      const locations = ["Corporate HQ", "Lake Gardens", "Newtown", "Rajarhat"];
      const rows = Array.from({ length: 5 }, (_, index) => [
        `${title.split(" ")[0].toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
        index === 0 ? `${title} Primary` : `${title} Record ${index + 1}`,
        locations[index % locations.length],
        index % 2 ? "Updated today" : "Reviewed 12 Jun",
        statuses[index % statuses.length]
      ]);
      return { title, parent, description, action, icon: "plus", labels, values, columns, rows };
    }

    const weeklyData = [
      { day: "Mon", present: 78, leave: 8, absent: 5 },
      { day: "Tue", present: 82, leave: 5, absent: 3 },
      { day: "Wed", present: 75, leave: 10, absent: 6 },
      { day: "Thu", present: 86, leave: 3, absent: 3 },
      { day: "Fri", present: 81, leave: 6, absent: 4 },
      { day: "Sat", present: 70, leave: 9, absent: 5 },
      { day: "Sun", present: 44, leave: 2, absent: 1 }
    ];

    let activePage = "dashboard";
    let attendancePage = 1;
    let selectedLocationId = "SCP102-LKG203";
    let activeLocationTab = "hours";
    let locationFormMode = "create";
    let editingLocationId = null;
    let hoursEditMode = false;
    let hoursDraft = null;
    let shiftPolicyKeyholderRequired = true;
    let rosterGeneratedSetup = null;
    let rosterGeneratedResult = null;
    let activeRosterBoardTab = "board";
    let currentRosterBoardRecord = null;
    let currentRosterBoardLocation = null;
    let activeLocationStep = 0;
    let activeEntityStep = 0;
    let activeEmployeeStep = 0;
    let selectedEntityId = null;
    let selectedEmployeeId = null;
    const attendancePageSize = 6;

    const $ = (selector, scope = document) => scope.querySelector(selector);
    const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

    function refreshIcons() {
      if (window.lucide) lucide.createIcons();
    }

    function renderWeeklyChart(multiplier = 1) {
      $("#weeklyChart").innerHTML = weeklyData.map(item => {
        const total = Math.round((item.present + item.leave + item.absent) * multiplier);
        const present = Math.round(item.present * multiplier);
        const leave = Math.round(item.leave * multiplier);
        const absent = Math.max(1, total - present - leave);
        return `
          <div class="chart-column" title="${item.day}: ${present} present, ${leave} leave, ${absent} absent">
            <div class="bar-stack" style="height:${Math.min(94, total)}%">
              <span class="bar present" style="height:${present}%"></span>
              <span class="bar leave" style="height:${leave}%"></span>
              <span class="bar absent" style="height:${absent}%"></span>
            </div>
            <span class="chart-label">${item.day}</span>
          </div>
        `;
      }).join("");
    }

    function renderAttendance() {
      const card = $("#dashboardView .table-card");
      const query = $(".record-search", card).value.trim().toLowerCase();
      const location = $(".location-filter", card).value;
      const status = $(".status-filter", card).value;
      const filtered = attendanceRecords.filter(record => {
        const matchesText = !query || `${record.name} ${record.id}`.toLowerCase().includes(query);
        const matchesLocation = location === "all" || record.location === location;
        const matchesStatus = status === "all" || record.status === status;
        return matchesText && matchesLocation && matchesStatus;
      });
      const pages = Math.max(1, Math.ceil(filtered.length / attendancePageSize));
      attendancePage = Math.min(attendancePage, pages);
      const start = (attendancePage - 1) * attendancePageSize;
      const visible = filtered.slice(start, start + attendancePageSize);

      $(".records-body", card).innerHTML = visible.map(record => `
        <tr data-record-id="${record.id}">
          <td class="checkbox-cell"><input class="row-checkbox" type="checkbox" aria-label="Select ${record.name}"></td>
          <td>
            <div class="employee-cell">
              <span class="employee-avatar">${record.initials}</span>
              <span><span class="cell-primary">${record.name}</span><span class="cell-secondary">${record.id}</span></span>
            </div>
          </td>
          <td>${record.location}</td>
          <td>${record.shift}</td>
          <td>${record.checkIn}</td>
          <td>${record.checkOut}</td>
          <td><span class="badge ${statusClass[record.status] || "grey"}">${record.status}</span></td>
          <td class="action-cell">
            <div class="row-menu-wrap">
              <button class="row-menu-button" aria-label="Actions for ${record.name}"><i data-lucide="ellipsis"></i></button>
              <div class="row-menu">
                <button data-row-action="view"><i data-lucide="eye"></i>View details</button>
                <button data-row-action="edit"><i data-lucide="pencil"></i>Correct record</button>
                <button data-row-action="history"><i data-lucide="history"></i>View history</button>
              </div>
            </div>
          </td>
        </tr>
      `).join("");

      $(".empty-state", card).classList.toggle("is-visible", filtered.length === 0);
      $("table", card).style.display = filtered.length ? "table" : "none";
      $(".range-start", card).textContent = filtered.length ? start + 1 : 0;
      $(".range-end", card).textContent = Math.min(start + attendancePageSize, filtered.length);
      $(".range-total", card).textContent = filtered.length;
      $(".page-prev", card).disabled = attendancePage === 1;
      $(".page-next", card).disabled = attendancePage === pages;
      const numberButtons = $$(".page-buttons .page-button:not(.page-prev):not(.page-next)", card);
      numberButtons.forEach((button, index) => {
        button.textContent = index + 1;
        button.style.display = index < pages ? "grid" : "none";
        button.classList.toggle("is-current", attendancePage === index + 1);
      });
      $(".select-all", card).checked = false;
      updateBulkBar(card);
      refreshIcons();
    }

    function updateBulkBar(card) {
      const selected = $$(".row-checkbox:checked", card).length;
      $(".bulk-bar", card).classList.toggle("is-visible", selected > 0);
      $(".bulk-count", card).textContent = `${selected} record${selected === 1 ? "" : "s"} selected`;
      $$("tbody tr", card).forEach(row => {
        row.classList.toggle("is-selected", $(".row-checkbox", row)?.checked);
      });
    }

    function setSelectOptions(select, options, selectedValue = "all") {
      select.innerHTML = options.map(option => `
        <option value="${option.value}" ${option.value === selectedValue ? "selected" : ""}>${option.label}</option>
      `).join("");
    }

    function restoreGenericModuleFilters() {
      const module = $("#moduleView");
      module.classList.remove("roster-control-view", "roster-board-view");
      $(".filter-bar", module).style.display = "";
      $(".table-wrap", module).classList.remove("roster-board-table-wrap");
      $(".filter-bar", module).innerHTML = `
        <div class="table-search">
          <i data-lucide="search"></i>
          <input id="moduleSearch" type="search" placeholder="Search records">
        </div>
        <select class="filter-select" id="moduleLocation"></select>
        <select class="filter-select" id="moduleStatus"></select>
        <button class="button" id="moduleReset"><i data-lucide="rotate-ccw"></i>Reset</button>
      `;
      $("#moduleSearch").addEventListener("input", () => renderModule(activePage));
      $("#moduleLocation").addEventListener("change", () => renderModule(activePage));
      $("#moduleStatus").addEventListener("change", () => renderModule(activePage));
      $("#moduleReset").addEventListener("click", () => {
        if (activePage === "roster") {
          $("#rosterPeriodFilter") && ($("#rosterPeriodFilter").value = "all");
          $("#rosterIssueFilter") && ($("#rosterIssueFilter").value = "all");
        }
        $("#moduleSearch").value = "";
        $("#moduleLocation").value = "all";
        $("#moduleStatus").value = "all";
        renderModule(activePage);
      });
      $(".table-search", module).style.display = "";
      $("#moduleSearch").placeholder = "Search records";
      setSelectOptions($("#moduleLocation"), [
        { value: "all", label: "All Locations" },
        { value: "Corporate HQ", label: "Corporate HQ" },
        { value: "Lake Gardens", label: "Lake Gardens" },
        { value: "Newtown", label: "Newtown" },
        { value: "Rajarhat", label: "Rajarhat" }
      ]);
      setSelectOptions($("#moduleStatus"), [
        { value: "all", label: "All Statuses" },
        { value: "Active", label: "Active" },
        { value: "Pending", label: "Pending" },
        { value: "Approved", label: "Approved" },
        { value: "Draft", label: "Draft" },
        { value: "Inactive", label: "Inactive" }
      ]);
      $("#rosterPeriodFilter")?.remove();
      $("#rosterIssueFilter")?.remove();
      $("#columnButton").style.display = "";
      $("#moduleReset").style.display = "";
      $(".pagination", module).style.display = "";
      $(".pagination", module).innerHTML = `
        <div class="pagination-copy">Showing <span id="moduleCount">0</span> records</div>
        <div class="page-buttons">
          <button class="page-button" disabled><i data-lucide="chevron-left"></i></button>
          <button class="page-button is-current">1</button>
          <button class="page-button" disabled><i data-lucide="chevron-right"></i></button>
        </div>
      `;
      $(".table-wrap", module).innerHTML = `
        <table>
          <thead id="moduleTableHead"></thead>
          <tbody id="moduleTableBody"></tbody>
        </table>
        <div class="empty-state" id="moduleEmpty">
          <i data-lucide="inbox"></i>
          <div class="empty-title">No matching records</div>
          <div class="empty-copy">Try changing the current filters.</div>
        </div>
      `;
    }

    function rosterOverviewRecords() {
      const presets = {
        "SCP102-LKG203": { rosterId: "RST-LKG-260622", period: "22 Jun – 28 Jun 2026", version: "v2", status: "Needs Review", filled: 51, open: 20, conflicts: 2, keyholder: "Ready", updated: "17 Jun 2026, 04:10 PM", issue: "Open Slots" },
        "SCP102-DSP202": { rosterId: "RST-DSP-260622", period: "22 Jun – 28 Jun 2026", version: "v1", status: "Draft", filled: 38, open: 8, conflicts: 1, keyholder: "Ready", updated: "16 Jun 2026, 06:35 PM", issue: "Skill Gap" },
        "PCP103-NTW204": { rosterId: "", period: "22 Jun – 28 Jun 2026", version: "-", status: "Not Generated", filled: 0, open: 0, conflicts: 0, keyholder: "Keyholder Missing", updated: "-", issue: "Keyholder Issue" },
        "HPR104-RJT205": { rosterId: "RST-RJT-260622", period: "22 Jun – 28 Jun 2026", version: "v1", status: "Ready to Publish", filled: 44, open: 0, conflicts: 0, keyholder: "Ready", updated: "17 Jun 2026, 11:15 AM", issue: "Pending Publish" },
        "IPL101-SLT201": { rosterId: "RST-HQ-260622", period: "22 Jun – 28 Jun 2026", version: "v3", status: "Published", filled: 30, open: 0, conflicts: 0, keyholder: "Ready", updated: "15 Jun 2026, 05:20 PM", issue: "Ready" }
      };
      return subLocations.map(location => {
        const record = presets[location.id];
        return {
          ...record,
          locationId: location.id,
          locationName: location.listName,
          displayName: location.name,
          activeShifts: location.shifts.filter(shift => shift[5] === "Active")
        };
      });
    }

    function ensureRosterFilters() {
      const module = $("#moduleView");
      module.classList.remove("roster-board-view");
      module.classList.add("roster-control-view");
      $(".filter-bar", module).style.display = "";
      $(".table-wrap", module).classList.remove("roster-board-table-wrap");
      $("#columnButton").style.display = "none";
      $(".filter-bar", module).innerHTML = `
        <div class="roster-filter-field">
          <label for="rosterPeriodFilter">Roster Period</label>
          <select class="filter-select" id="rosterPeriodFilter">
            <option value="22 Jun – 28 Jun 2026">22 Jun – 28 Jun 2026</option>
            <option value="all">All Periods</option>
            <option value="June 2026">June 2026</option>
          </select>
        </div>
        <div class="roster-filter-field">
          <label for="moduleLocation">Location</label>
          <select class="filter-select" id="moduleLocation">
            <option value="all">All Locations</option>
            ${subLocations.map(location => `<option value="${location.id}">${location.listName}</option>`).join("")}
          </select>
        </div>
        <div class="roster-filter-field">
          <label for="moduleStatus">Roster Status</label>
          <select class="filter-select" id="moduleStatus">
            <option value="all">All Statuses</option>
            <option value="Not Generated">Not Generated</option>
            <option value="Draft">Draft</option>
            <option value="Needs Review">Needs Review</option>
            <option value="Ready to Publish">Ready to Publish</option>
            <option value="Published">Published</option>
            <option value="Superseded">Superseded</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div class="roster-filter-field">
          <label for="rosterIssueFilter">Issue Type</label>
          <select class="filter-select" id="rosterIssueFilter">
            <option value="all">All Issue Types</option>
            <option value="Open Slots">Open Slots</option>
            <option value="Leave Conflict">Leave Conflict</option>
            <option value="Keyholder Issue">Keyholder Issue</option>
            <option value="Skill Gap">Skill Gap</option>
            <option value="Pending Publish">Pending Publish</option>
          </select>
        </div>
        <button class="button roster-filter-button" id="rosterFilterButton" type="button"><i data-lucide="filter"></i>Filters</button>
        <button class="button roster-reset-button" id="moduleReset" type="button">Reset</button>
      `;
      $("#rosterPeriodFilter").addEventListener("change", () => renderRosterControlCenter());
      $("#moduleLocation").addEventListener("change", () => renderRosterControlCenter());
      $("#moduleStatus").addEventListener("change", () => renderRosterControlCenter());
      $("#rosterIssueFilter").addEventListener("change", () => renderRosterControlCenter());
      $("#rosterFilterButton").addEventListener("click", () => showToast("Roster filters are applied to the overview."));
      $("#moduleReset").addEventListener("click", () => {
        $("#rosterPeriodFilter").value = "22 Jun – 28 Jun 2026";
        $("#moduleLocation").value = "all";
        $("#moduleStatus").value = "all";
        $("#rosterIssueFilter").value = "all";
        renderRosterControlCenter();
      });
    }

    function renderRosterControlCenter() {
      const previousPeriod = $("#rosterPeriodFilter")?.value || "22 Jun – 28 Jun 2026";
      const previousLocation = $("#moduleLocation")?.value || "all";
      const previousStatus = $("#moduleStatus")?.value || "all";
      const previousIssue = $("#rosterIssueFilter")?.value || "all";
      restoreGenericModuleFilters();
      ensureRosterFilters();
      if ($("#rosterPeriodFilter")) $("#rosterPeriodFilter").value = previousPeriod;
      if ($("#moduleLocation")) $("#moduleLocation").value = previousLocation;
      if ($("#moduleStatus")) $("#moduleStatus").value = previousStatus;
      if ($("#rosterIssueFilter")) $("#rosterIssueFilter").value = previousIssue;
      const period = $("#rosterPeriodFilter")?.value || "all";
      const locationId = $("#moduleLocation").value;
      const status = $("#moduleStatus").value;
      const issue = $("#rosterIssueFilter")?.value || "all";
      const records = rosterOverviewRecords().filter(record =>
        (period === "all" || record.period === period) &&
        (locationId === "all" || record.locationId === locationId) &&
        (status === "all" || record.status === status) &&
        (issue === "all" || record.issue === issue)
      );
      const all = rosterOverviewRecords();
      const summary = [
        ["Total Locations", "5", "Active locations", "building-2", "blue"],
        ["Published Rosters", "2", "40% of locations", "circle-check", "green"],
        ["Draft Rosters", "1", "20% of locations", "file-text", "amber"],
        ["Open Slots", "28", "Across all locations", "user-round-x", "red"],
        ["Needs Review", "1", "Locations with issues", "triangle-alert", "purple"]
      ];
      $("#moduleSummary").innerHTML = summary.map(item => `
        <article class="card summary-card roster-summary-card">
          <span class="roster-summary-icon ${item[4]}"><i data-lucide="${item[3]}"></i></span>
          <div>
            <div class="summary-label">${item[0]}</div>
            <div class="summary-value">${item[1]}</div>
            <div class="summary-note">${item[2]}</div>
          </div>
        </article>
      `).join("");
      $("#moduleTableTitle").textContent = "Location Roster Overview";
      $("#moduleTableSubtitle").textContent = "Which locations have rosters, what state they are in, and where review is needed.";
      $("#moduleTableHead").innerHTML = `
        <tr>
          <th>Location</th><th>Roster Period</th><th>Roster Version</th><th>Roster Status</th>
          <th>Filled Slots</th><th>Open Slots</th><th>Conflicts</th><th>Keyholder Coverage</th><th>Last Updated</th><th class="action-cell">Action</th>
        </tr>`;
      $("#moduleTableBody").innerHTML = records.map(record => {
        const primaryAction = record.status === "Not Generated"
          ? "Generate"
          : record.status === "Ready to Publish"
            ? "Publish"
            : "View";
        const primaryClass = primaryAction === "Publish" ? "action-primary publish" : "action-primary";
        return `
          <tr data-roster-id="${record.rosterId}" data-location-id="${record.locationId}">
            <td><span class="roster-location-name">${record.locationName}</span><span class="roster-location-code">${record.locationId}</span></td>
            <td>${record.period}</td>
            <td>${record.version}</td>
            <td><span class="badge ${statusClass[record.status] || "grey"}">${record.status}</span></td>
            <td>${record.filled}</td>
            <td><span class="badge ${record.open ? "amber" : "grey"} roster-count-chip">${record.open}</span></td>
            <td><span class="badge ${record.conflicts ? "red" : "grey"} roster-count-chip">${record.conflicts}</span></td>
            <td><span class="badge ${statusClass[record.keyholder] || "grey"}">${record.keyholder}</span></td>
            <td>${record.updated}</td>
            <td class="action-cell roster-action-cell">
              <button class="button ${primaryClass} roster-row-primary" data-roster-primary="${primaryAction.toLowerCase()}" data-roster-id="${record.rosterId}" data-location-id="${record.locationId}" type="button">${primaryAction}</button>
              <button class="action-more" data-roster-more="${record.locationId}" aria-label="More roster actions for ${record.locationName}" type="button"><i data-lucide="ellipsis-vertical"></i></button>
            </td>
          </tr>
        `;
      }).join("");
      $("#moduleEmpty").classList.toggle("is-visible", records.length === 0);
      $("#moduleTableBody").closest("table").style.display = records.length ? "table" : "none";
      $("#moduleCount").textContent = records.length;
      $(".pagination", $("#moduleView")).style.display = "";
      $(".pagination", $("#moduleView")).innerHTML = `
        <div class="pagination-copy">Showing 1 to ${records.length} of ${all.length} locations</div>
        <div class="page-buttons">
          <button class="page-button" disabled><i data-lucide="chevron-left"></i></button>
          <button class="page-button is-current">1</button>
          <button class="page-button" disabled><i data-lucide="chevron-right"></i></button>
          <select class="pagination-page-size" aria-label="Rows per page">
            <option>10 / page</option>
            <option>25 / page</option>
          </select>
        </div>
      `;
      refreshIcons();
    }

    function rosterBoardEmployees(location) {
      const byLocation = {
        "SCP102-LKG203": [
          ["SCP102-EMP022", "Subham Sen", "Assistant Manager", "Retail"],
          ["SCP102-EMP026", "Debjit Mitra", "Senior Groomer", "Grooming"],
          ["SCP102-EMP031", "Tania Biswas", "Groomer", "Grooming"],
          ["IPL101-EMP014", "Meera Roy", "Store Manager", "Operations"]
        ],
        "SCP102-DSP202": [
          ["SCP102-EMP041", "Riya Saha", "Store Manager", "Retail"],
          ["SCP102-EMP042", "Abir Nandi", "Sales Associate", "Retail"],
          ["SCP102-EMP043", "Moumita Paul", "Groomer", "Grooming"]
        ],
        "PCP103-NTW204": [
          ["PCP103-EMP006", "Priya Paul", "Store Manager", "Retail"],
          ["PCP103-EMP011", "Amit Das", "Sales Associate", "Retail"]
        ],
        "HPR104-RJT205": [
          ["HPR104-EMP017", "Nandita Roy", "Store Manager", "Retail"],
          ["HPR104-EMP018", "Sourav Pal", "Sales Associate", "Retail"],
          ["HPR104-EMP019", "Rakesh Shaw", "Groomer", "Grooming"]
        ],
        "IPL101-SLT201": [
          ["IPL101-EMP003", "Ananya Ghosh", "HR Manager", "HR"],
          ["IPL101-EMP009", "Rohan Dutta", "Finance Executive", "Finance"],
          ["IPL101-EMP014", "Meera Roy", "Operations Admin", "Operations"]
        ]
      };
      return byLocation[location.id] || [];
    }

    function parseRosterPeriod(period) {
      const normalized = String(period || "")
        .replace(/â€“/g, "-")
        .replace(/[–—]/g, "-")
        .replace(/\s+-\s+/g, " - ");
      const match = normalized.match(/(\d{1,2})\s+([A-Za-z]{3})(?:\s+\d{4})?\s+-\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
      if (!match) return null;
      const monthIndex = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const startMonth = monthIndex[match[2].toLowerCase()];
      const endMonth = monthIndex[match[4].toLowerCase()];
      const year = Number(match[5]);
      if (startMonth === undefined || endMonth === undefined || !year) return null;
      return {
        start: new Date(year, startMonth, Number(match[1])),
        end: new Date(year, endMonth, Number(match[3]))
      };
    }

    function rosterBoardDates(period) {
      const parsed = parseRosterPeriod(period);
      if (!parsed) {
        return Array.from({ length: 7 }, (_, index) => ({
          day: index + 22,
          label: `${index + 22} Jun`,
          dayName: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
          monthLabel: "Jun",
          year: 2026,
          iso: `2026-06-${String(index + 22).padStart(2, "0")}`
        }));
      }
      const dates = [];
      const cursor = new Date(parsed.start);
      while (cursor <= parsed.end && dates.length < 31) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth() + 1;
        const day = cursor.getDate();
        dates.push({
          day,
          label: cursor.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
          dayName: cursor.toLocaleDateString("en-GB", { weekday: "short" }),
          monthLabel: cursor.toLocaleDateString("en-GB", { month: "short" }),
          year,
          iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      return dates;
    }

    function employeeInitials(name) {
      return String(name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() || "")
        .join("") || "EP";
    }

    function isRosterEmployeeKeyholder(employeeId, locationId) {
      return keyholderEmployees.some(employee =>
        employee.id === employeeId &&
        employee.locationId === locationId &&
        employee.status === "Active" &&
        employee.keyholderEligible
      );
    }

    function renderRosterCell(employeeIndex, dayIndex, activeShifts, employee, date) {
      const cellContext = `data-roster-cell="true" data-employee-name="${employee[1]}" data-roster-date="${date.label} ${date.year}"`;
      if ((dayIndex + employeeIndex) % 9 === 0) {
        return `<div class="roster-cell leave" ${cellContext}><strong>Leave</strong><span>Approved</span></div>`;
      }
      if ((dayIndex + employeeIndex) % 7 === 0) {
        return `<div class="roster-cell off" ${cellContext}><strong>Weekly Off</strong><span>Roster off</span></div>`;
      }
      const shift = activeShifts[(dayIndex + employeeIndex) % Math.max(1, activeShifts.length)];
      if (!shift) {
        return `<div class="roster-cell open" ${cellContext}><strong>Open Slot</strong><span>No active shift policy</span></div>`;
      }
      const shiftTone = `shift-${(dayIndex + employeeIndex) % Math.max(1, activeShifts.length)}`;
      return `<div class="roster-cell ${shiftTone}" ${cellContext} data-shift-name="${shift[1]}"><strong>${shift[1]}</strong><span>${shift[2]}</span></div>`;
    }

    function renderRosterBoardActions(record, location, activeShifts) {
      const hasActiveShifts = activeShifts.length > 0;
      const canPublish = record.status === "Ready to Publish" && record.open === 0 && record.conflicts === 0;
      const actionTitle = record.status === "Not Generated"
        ? "Create the first roster draft"
        : record.status === "Published"
          ? "Published roster is read-only"
          : "Update roster draft";
      const actionNote = !hasActiveShifts
        ? "No active Location Shift Policy is available. Activate shift policy before generating a usable roster."
        : record.status === "Published"
          ? "Create a revision before changing employee slots or open slots."
          : "Use these actions to edit open slots, regenerate the draft, publish, export or inspect history.";
      const primaryAction = record.status === "Published"
        ? `<button class="button primary" data-roster-board-action="revision" data-location-id="${location.id}" type="button"><i data-lucide="git-branch"></i>Create Revision / Edit</button>`
        : record.status === "Not Generated"
          ? `<button class="button primary" data-roster-board-action="generate" data-location-id="${location.id}" type="button" ${hasActiveShifts ? "" : "disabled"}><i data-lucide="wand-sparkles"></i>Generate Draft</button>`
          : `<button class="button primary" data-roster-board-action="edit" data-location-id="${location.id}" type="button"><i data-lucide="pencil"></i>Edit Roster Draft</button>`;
      return `
        ${hasActiveShifts ? "" : `
          <div class="roster-board-alert">
            <i data-lucide="triangle-alert"></i>
            <div>
              <strong>Roster cannot be generated properly yet.</strong><br>
              This location has no active shift policy. Activate Location Shift Policy first, otherwise the board can only show open slots.
            </div>
          </div>
        `}
        <div class="roster-board-actions">
          <div class="roster-board-action-copy">
            <div class="roster-board-action-title">${actionTitle}</div>
            <div class="roster-board-action-note">${actionNote}</div>
          </div>
          <div class="roster-board-action-buttons">
            ${primaryAction}
            <button class="button" data-roster-board-action="open-slot" data-location-id="${location.id}" type="button" ${record.status === "Published" ? "disabled" : ""}><i data-lucide="user-plus"></i>Add Employee to Open Slot</button>
            <button class="button" data-roster-board-action="publish" data-location-id="${location.id}" type="button" ${canPublish ? "" : "disabled"}><i data-lucide="send"></i>Publish</button>
            <button class="button" data-roster-board-action="export" data-location-id="${location.id}" type="button"><i data-lucide="download"></i>Export</button>
            <button class="button" data-roster-board-action="history" data-location-id="${location.id}" type="button"><i data-lucide="history"></i>History</button>
            ${hasActiveShifts ? "" : `<button class="button" data-roster-board-action="shift-policy" data-location-id="${location.id}" type="button"><i data-lucide="clock-3"></i>Open Shift Policy</button>`}
          </div>
        </div>
      `;
    }

    function openRosterBoard(rosterId, locationId) {
      const record = rosterOverviewRecords().find(item => rosterId && item.rosterId === rosterId)
        || rosterOverviewRecords().find(item => item.locationId === locationId)
        || rosterOverviewRecords()[0];
      const location = subLocations.find(item => item.id === locationId) || subLocations[0];
      activePage = "roster-board";
      activeRosterBoardTab = "board";
      $$(".nav-single, .nav-child").forEach(button => button.classList.remove("is-active"));
      const rosterNav = $('.nav-single[data-page="roster"], .nav-child[data-page="roster"]');
      if (rosterNav) {
        rosterNav.classList.add("is-active");
        const rosterGroup = rosterNav.closest(".nav-group");
        if (rosterGroup) openGroup(rosterGroup, true);
      }
      $("#dashboardView").classList.remove("is-active");
      $("#locationControlView").classList.remove("is-active");
      $("#locationFormView").classList.remove("is-active");
      $("#entityFormView").classList.remove("is-active");
      $("#employeeFormView").classList.remove("is-active");
      $("#moduleView").classList.add("is-active");
      setPageHeader("Roster", `${location.listName} Roster Board`, "View and manage the monthly roster for this location.", "Back to Roster", "arrow-left");
      renderRosterBoard(record, location);
      window.scrollTo({ top: 0, behavior: "smooth" });
      refreshIcons();
    }

    function renderRosterBoardTabs() {
      const tabs = [
        ["board", "Roster Board"],
        ["issues", "Open Slots & Conflicts"],
        ["history", "History"]
      ];
      return `
        <div class="roster-board-tabs">
          ${tabs.map(tab => `<button class="roster-board-tab ${activeRosterBoardTab === tab[0] ? "is-active" : ""}" data-roster-board-tab="${tab[0]}" type="button">${tab[1]}</button>`).join("")}
        </div>
      `;
    }

    function renderRosterBoardGrid(record, location, activeShifts, employees, dates) {
      const boardWidth = 230 + (dates.length * 152);
      return `
        <div class="roster-board-shell">
          <table class="roster-board-table" style="min-width:${boardWidth}px">
            <thead>
              <tr>
                <th class="employee-column">Employee</th>
                ${dates.map(date => `<th><span>${date.dayName}</span><strong>${date.day}</strong><small>${date.monthLabel}</small></th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${employees.map((employee, employeeIndex) => `
                <tr>
                  <td class="employee-column">
                    <div class="roster-employee">
                      <span class="roster-avatar">${employeeInitials(employee[1])}</span>
                      <span>
                        <strong class="roster-employee-name">
                          ${employee[1]}
                          ${isRosterEmployeeKeyholder(employee[0], location.id) ? `<i class="roster-keyholder-icon" data-lucide="key-round" aria-label="Keyholder eligible"></i>` : ""}
                        </strong>
                        <div class="field-help">${employee[2]} | ${employee[3]}</div>
                      </span>
                    </div>
                  </td>
                  ${dates.map((date, dayIndex) => `<td>${renderRosterCell(employeeIndex, dayIndex, activeShifts, employee, date)}</td>`).join("")}
                </tr>
              `).join("")}
              <tr>
                <td class="employee-column"><strong>Open Slots</strong><div class="field-help">Unassigned requirements</div></td>
                ${dates.map((date, dayIndex) => {
                  const hasOpen = record.open && dayIndex % 5 === 0;
                  return `<td>${hasOpen ? `<div class="roster-cell open" data-roster-cell="true" data-employee-name="Open Slot" data-roster-date="${date.label} ${date.year}"><strong>Open Slot</strong><span>1 ${location.services[0]?.[1] || "Staff"}</span></div>` : ""}</td>`;
                }).join("")}
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    function renderRosterIssuePanel(record, location, activeShifts, dates) {
      const rows = [
        [dates[2]?.label || record.period, activeShifts[0]?.[1] || "Shift", `1 ${location.services[0]?.[1] || "Staff"}`, "Open Slot", "Review"],
        [dates[3]?.label || record.period, activeShifts[1]?.[1] || activeShifts[0]?.[1] || "Shift", "Tania Biswas", "Leave Conflict", "Review"],
        [dates[4]?.label || record.period, activeShifts[0]?.[1] || "Shift", "Keyholder coverage", record.keyholder === "Ready" ? "Ready" : "Blocked"],
        [dates[5]?.label || record.period, activeShifts[1]?.[1] || activeShifts[0]?.[1] || "Shift", "Grooming skill coverage", record.open ? "Review" : "Ready"]
      ];
      return `
        <div class="roster-issue-table">
          <table>
            <thead><tr><th>Date</th><th>Shift</th><th>Requirement</th><th>Issue</th><th>Status</th></tr></thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  <td>${row[0]}</td>
                  <td>${row[1]}</td>
                  <td>${row[2]}</td>
                  <td>${row[3]}</td>
                  <td><span class="badge ${statusClass[row[4]] || (row[4] === "Review" ? "amber" : "grey")}">${row[4]}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    function renderRosterHistoryPanel(record, location) {
      const history = [
        ["Draft generated", `${location.listName} roster created for ${record.period}.`, "System | 17 Jun 2026, 03:40 PM"],
        ["Validation completed", `${record.open} open slots and ${record.conflicts} conflicts marked for review.`, "HR Admin | 17 Jun 2026, 04:02 PM"],
        ["Slot edited", "One employee assignment updated with reason captured.", "Vikram Admin | 17 Jun 2026, 04:08 PM"],
        ["Ready for review", `Roster version ${record.version} is awaiting final action.`, "System | ${record.updated}"]
      ];
      return `
        <div class="roster-history-list">
          ${history.map(item => `
            <div class="roster-history-item">
              <div><strong>${item[0]}</strong><span>${item[1]}</span></div>
              <small>${item[2]}</small>
            </div>
          `).join("")}
        </div>
      `;
    }

    function setRosterBoardTab(tabKey) {
      activeRosterBoardTab = tabKey;
      $$(".roster-board-tab").forEach(tab => tab.classList.toggle("is-active", tab.dataset.rosterBoardTab === tabKey));
      $$(".roster-board-panel").forEach(panel => panel.classList.toggle("is-active", panel.dataset.rosterBoardPanel === tabKey));
    }

    function renderRosterBoard(record, location) {
      activeRosterBoardTab = activeRosterBoardTab || "board";
      currentRosterBoardRecord = record;
      currentRosterBoardLocation = location;
      const activeShifts = location.shifts.filter(shift => shift[5] === "Active");
      const employees = rosterBoardEmployees(location);
      const dates = rosterBoardDates(record.period);
      const summary = [
        ["Filled Slots", record.filled, "Assigned employee slots", "calendar-check-2", "blue"],
        ["Open Slots", record.open, "Calculated from roster slots", "user-round-x", "amber"],
        ["Conflicts", record.conflicts, "Needs roster review", "triangle-alert", "red"],
        ["Keyholder Coverage", record.keyholder, "Eligibility checked", "key-round", "green"],
        ["Employees", employees.length, "Assigned to location", "users-round", "blue"]
      ];
      $("#moduleSummary").innerHTML = summary.map(item => `
        <article class="card summary-card roster-summary-card">
          <div>
            <div class="summary-label">${item[0]}</div>
            <div class="summary-value">${item[1]}</div>
            <div class="summary-note">${item[2]}</div>
          </div>
          <span class="roster-summary-icon ${item[4]}"><i data-lucide="${item[3]}"></i></span>
        </article>
      `).join("");
      $("#columnButton").style.display = "none";
      $("#moduleTableTitle").textContent = "Roster Board";
      $("#moduleTableSubtitle").textContent = `${location.listName} | ${record.period} | ${record.version}`;
      const module = $("#moduleView");
      module.classList.remove("roster-control-view");
      module.classList.add("roster-board-view");
      $(".filter-bar", module).innerHTML = "";
      $(".filter-bar", module).style.display = "none";
      $(".table-wrap", module).classList.add("roster-board-table-wrap");
      const toolbar = `
        <div class="roster-board-toolbar">
          <div class="roster-board-legend">
            ${activeShifts.map((shift, index) => `<span class="badge ${index % 2 ? "green" : "blue"}">${shift[1]}</span>`).join("")}
            <span class="badge grey">Weekly Off</span>
            <span class="badge blue">Leave</span>
            <span class="badge amber">Open Slot</span>
            <span class="badge red">Conflict</span>
          </div>
          <div class="roster-board-toolbar-actions">
            <button class="button" data-roster-board-action="validate" data-location-id="${location.id}" type="button"><i data-lucide="shield-check"></i>Validate</button>
            <button class="button" data-roster-board-action="export" data-location-id="${location.id}" type="button"><i data-lucide="download"></i>Export</button>
            <button class="button primary" data-roster-board-action="publish" data-location-id="${location.id}" type="button" ${record.open || record.conflicts ? "disabled" : ""}><i data-lucide="send"></i>Publish Draft</button>
          </div>
        </div>
      `;
      const context = `
        <div class="roster-context-bar">
          <div class="roster-context-item"><span>Location</span><strong>${location.listName}</strong></div>
          <div class="roster-context-item"><span>Roster Period</span><strong>${record.period}</strong></div>
          <div class="roster-context-item"><span>Version</span><strong>${record.version}</strong></div>
          <div class="roster-context-item"><span>Status</span><strong><span class="badge ${statusClass[record.status] || "grey"}">${record.status}</span></strong></div>
          <div class="roster-context-item"><span>Last Updated</span><strong>${record.updated}</strong></div>
        </div>
      `;
      $(".table-wrap", $("#moduleView")).innerHTML = `
        ${context}
        ${renderRosterBoardTabs()}
        <section class="roster-board-panel ${activeRosterBoardTab === "board" ? "is-active" : ""}" data-roster-board-panel="board">
          ${renderRosterBoardGrid(record, location, activeShifts, employees, dates)}
        </section>
        <section class="roster-board-panel ${activeRosterBoardTab === "issues" ? "is-active" : ""}" data-roster-board-panel="issues">
          ${renderRosterIssuePanel(record, location, activeShifts, dates)}
        </section>
        <section class="roster-board-panel ${activeRosterBoardTab === "history" ? "is-active" : ""}" data-roster-board-panel="history">
          ${renderRosterHistoryPanel(record, location)}
        </section>
        ${toolbar}
      `;
      $(".pagination", $("#moduleView")).style.display = "none";
      refreshIcons();
    }

    function renderModule(pageKey) {
      const config = pageConfig[pageKey];
      if (!config) return;
      if (pageKey === "roster") {
        renderRosterControlCenter();
        return;
      }
      restoreGenericModuleFilters();
      const search = $("#moduleSearch").value.trim().toLowerCase();
      const location = $("#moduleLocation").value;
      const status = $("#moduleStatus").value;
      const rows = config.rows.filter(row => {
        const rowText = row.join(" ").toLowerCase();
        const rowLocation = row.find(value => ["Corporate HQ", "Lake Gardens", "Newtown", "Rajarhat"].includes(value));
        const rowStatus = row[row.length - 1];
        return (!search || rowText.includes(search))
          && (location === "all" || rowLocation === location)
          && (status === "all" || rowStatus === status);
      });

      $("#moduleSummary").innerHTML = config.labels.map((label, index) => `
        <article class="card summary-card">
          <div class="summary-label">${label}</div>
          <div class="summary-value">${config.values[index]}</div>
          <div class="summary-note">${index === 0 ? "Current operational total" : index === 1 ? "Within configured scope" : "Requires routine monitoring"}</div>
        </article>
      `).join("");

      $("#moduleTableTitle").textContent = `${config.title} Records`;
      $("#moduleTableSubtitle").textContent = `Current ${config.parent.toLowerCase()} data and workflow status`;
      $("#moduleTableHead").innerHTML = `<tr><th class="checkbox-cell"><input type="checkbox" aria-label="Select all"></th>${config.columns.map(column => `<th>${column}</th>`).join("")}<th class="action-cell">Action</th></tr>`;
      $("#moduleTableBody").innerHTML = rows.map((row, rowIndex) => `
        <tr class="${pageKey === "entity-master" && row[0] === selectedEntityId ? "is-selected" : ""}">
          <td class="checkbox-cell"><input type="checkbox" aria-label="Select record ${rowIndex + 1}"></td>
          ${row.map((cell, index) => {
            const isStatus = index === row.length - 1;
            return `<td>${isStatus ? `<span class="badge ${statusClass[cell] || "grey"}">${cell}</span>` : cell}</td>`;
          }).join("")}
          <td class="action-cell"><button class="row-menu-button module-row-action" aria-label="Record actions"><i data-lucide="ellipsis"></i></button></td>
        </tr>
      `).join("");
      $("#moduleEmpty").classList.toggle("is-visible", rows.length === 0);
      $("#moduleTableBody").closest("table").style.display = rows.length ? "table" : "none";
      $("#moduleCount").textContent = rows.length;
      refreshIcons();
    }

    function getSelectedLocation() {
      return subLocations.find(location => location.id === selectedLocationId) || subLocations[0];
    }

    function isFallbackShift(shift) {
      return shift?.[6] === "Fallback" || /official hours coverage/i.test(shift?.[1] || "");
    }

    function fallbackShiftForLocation(location) {
      if (!location || location.type === "Head Office") return null;
      const existing = (location.shifts || []).find(shift => isFallbackShift(shift));
      if (existing) return existing;
      return [
        `${location.id}-OHC`,
        "Official Hours Coverage",
        location.officialHours,
        "1",
        "Rotational",
        "Active",
        "Fallback"
      ];
    }

    function shiftCoverageRole(shift) {
      return isFallbackShift(shift) ? "Fallback" : "Standard";
    }

    function shiftRowsForLocation(location) {
      const fallback = fallbackShiftForLocation(location);
      const rows = [...(location.shifts || [])];
      return fallback && !rows.some(shift => shift[0] === fallback[0]) ? [...rows, fallback] : rows;
    }

    function titleCaseValue(value) {
      return String(value || "")
        .replaceAll("_", " ")
        .replace(/\b\w/g, character => character.toUpperCase());
    }

    function locationTypeLabel(value) {
      return {
        store: "Retail Store",
        warehouse: "Warehouse",
        office: "Head Office",
        hub: "Hub"
      }[value] || titleCaseValue(value);
    }

    function renderLocationKpis() {
      const active = subLocations.filter(location => location.status === "Active").length;
      const ready = subLocations.filter(location => location.readinessLabel === "Ready").length;
      const blocked = subLocations.filter(location => location.readinessLabel === "Blocked").length;
      const incomplete = subLocations.length - ready - blocked;
      $("#totalLocationCount").textContent = subLocations.length;
      $("#activeLocationCount").textContent = active;
      $("#readyLocationCount").textContent = ready;
      $("#incompleteLocationCount").textContent = incomplete;
      $("#blockedLocationCount").textContent = blocked;
      $("#locationListCount").textContent = `(${subLocations.length})`;
    }

    function renderLocationList() {
      const query = $("#locationSearch").value.trim().toLowerCase();
      const locations = subLocations.filter(location =>
        `${location.name} ${location.listName} ${location.id} ${location.parent}`.toLowerCase().includes(query)
      );

      $("#locationList").innerHTML = locations.map(location => `
        <button class="location-list-item ${location.id === selectedLocationId ? "is-selected" : ""}" data-location-id="${location.id}">
          <span class="location-pin"><i data-lucide="map-pin"></i></span>
          <span class="location-item-copy">
            <span class="location-item-name">${location.listName}</span>
            <span class="location-item-code">${location.id}</span>
          </span>
          <span class="location-item-state">
            <span class="badge ${statusClass[location.status] || "grey"}">${location.status}</span>
            <span class="readiness-text ${location.readinessTone}">${location.readinessLabel}</span>
          </span>
        </button>
      `).join("");

      if (!locations.length) {
        $("#locationList").innerHTML = `<div class="location-empty">No locations match the current search.</div>`;
      }
      $("#locationListFoot").textContent = locations.length
        ? `Showing 1 to ${locations.length} of ${subLocations.length} locations`
        : `Showing 0 of ${subLocations.length} locations`;
      refreshIcons();
    }

    function renderLocationMeta(location) {
      $("#selectedLocationName").textContent = location.name;
      $("#selectedLocationStatus").textContent = location.status;
      $("#selectedLocationStatus").className = `badge ${statusClass[location.status] || "grey"}`;
      $("#selectedLocationMeta").innerHTML = `
        <div class="location-meta-item">
          <div class="location-meta-label">Location Code</div>
          <div class="location-meta-value">${location.id}</div>
        </div>
        <div class="location-meta-item">
          <div class="location-meta-label">Parent Entity</div>
          <div class="location-meta-value">${location.parent} (${location.parentCode})</div>
        </div>
        <div class="location-meta-item">
          <div class="location-meta-label">State</div>
          <div class="location-meta-value">${location.state}</div>
        </div>
        <div class="location-meta-item">
          <div class="location-meta-label">Operating Type</div>
          <div class="location-meta-value">${location.type}</div>
        </div>
        <div class="location-meta-item">
          <div class="location-meta-label">Readiness Score</div>
          <div class="location-meta-value readiness-score">
            <span>${location.readiness}%</span>
            <span class="score-ring" style="--score:${location.readiness}%"></span>
          </div>
        </div>
      `;
    }

    function tabHeader(title, description, actions = "") {
      return `
        <div class="tab-section-head">
          <div>
            <h3 class="tab-section-title">${title}</h3>
            <p class="tab-section-copy">${description}</p>
          </div>
          ${actions ? `<div class="tab-section-actions">${actions}</div>` : ""}
        </div>
      `;
    }

    function renderOverviewTab(location) {
      const configuredServices = location.services.filter(service => service[3] === "Active").length;
      const activePolicies = location.shifts.filter(shift => shift[5] === "Active").length;
      const weeklyHours = location.closedDay ? "54 hrs" : "77 hrs";
      const areas = [
        ["Operating Hours", "Configured"],
        ["Service Config", location.services.length ? (configuredServices === location.services.length ? "Configured" : "In Progress") : "Not Applicable"],
        ["Delivery Zone", location.deliveryZones.length ? "Configured" : "Not Applicable"],
        ["Onboarding Checklist", location.readiness >= 80 ? "Completed" : "In Progress"],
        ["Shift Policy", activePolicies ? "Configured" : "In Progress"]
      ];
      return `
        ${tabHeader("Location Overview", "Current setup status for the selected location.",
          `<button class="button" data-control-action="readiness"><i data-lucide="clipboard-check"></i>Run Readiness Check</button>`)}
        <div class="overview-grid">
          <div class="overview-metric">
            <div class="overview-metric-head"><span>Configured Services</span><i data-lucide="briefcase-business"></i></div>
            <div class="overview-metric-value">${configuredServices}</div>
            <div class="overview-metric-note">${location.type === "Head Office" ? "Not applicable to this office" : `${location.services.length} service records`}</div>
          </div>
          <div class="overview-metric">
            <div class="overview-metric-head"><span>Shift Policies</span><i data-lucide="clock-3"></i></div>
            <div class="overview-metric-value">${location.shifts.length}</div>
            <div class="overview-metric-note">${activePolicies} active for roster use</div>
          </div>
          <div class="overview-metric">
            <div class="overview-metric-head"><span>Weekly Operating Time</span><i data-lucide="calendar-days"></i></div>
            <div class="overview-metric-value">${weeklyHours}</div>
            <div class="overview-metric-note">${location.closedDay ? `Closed on ${location.closedDay}` : "Open all seven days"}</div>
          </div>
        </div>
        <div class="control-table-wrap">
          <table class="control-table">
            <thead><tr><th>Setup Area</th><th>Scope</th><th>Status</th><th class="action-cell">Action</th></tr></thead>
            <tbody>
              ${areas.map(area => `
                <tr>
                  <td>${area[0]}</td>
                  <td>${location.listName}</td>
                  <td><span class="badge ${statusClass[area[1]] || "grey"}">${area[1]}</span></td>
                  <td class="action-cell"><button class="row-menu-button" data-control-action="open-area" aria-label="Open ${area[0]}"><i data-lucide="chevron-right"></i></button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    function formatTime24Hour(value) {
      if (!value) return "—";
      const [hourValue, minute = "00"] = value.split(":");
      const hour = Number(hourValue);
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${String(displayHour).padStart(2, "0")}:${minute} ${period}`;
    }

    function formatHourRange(open, close) {
      if (!open || !close) return "Not configured";
      return `${formatTime24Hour(open)} - ${formatTime24Hour(close)}`;
    }

    function timeValueParts(value) {
      const [hourValue = "00", minuteValue = "00"] = String(value || "00:00").split(":");
      const hour24 = Number(hourValue);
      return {
        hour: String(hour24 % 12 || 12).padStart(2, "0"),
        minute: String(Math.max(0, Math.min(59, Number(minuteValue) || 0))).padStart(2, "0"),
        period: hour24 >= 12 ? "PM" : "AM"
      };
    }

    function composeTimeValue(hour, minute, period) {
      const safeHour = Math.max(1, Math.min(12, Number(hour) || 12));
      const safeMinute = Math.max(0, Math.min(59, Number(minute) || 0));
      const hour24 = period === "PM"
        ? (safeHour === 12 ? 12 : safeHour + 12)
        : (safeHour === 12 ? 0 : safeHour);
      return `${String(hour24).padStart(2, "0")}:${String(safeMinute).padStart(2, "0")}`;
    }

    function renderNumberOptions(start, end, selectedValue) {
      return Array.from({ length: end - start + 1 }, (_, index) => {
        const value = String(start + index).padStart(2, "0");
        return `<option value="${value}" ${value === selectedValue ? "selected" : ""}>${value}</option>`;
      }).join("");
    }

    function renderSplitTimeControl({ value, field, dayOfWeek = "", disabled = false, label = "", mode = "hours" }) {
      const parts = timeValueParts(value);
      const disabledAttribute = disabled ? "disabled" : "";
      const baseAttributes = mode === "hours"
        ? `data-hours-field="${field}" data-day-of-week="${dayOfWeek}"`
        : `data-shift-time-field="${field}"`;
      const partAttribute = mode === "hours" ? "data-hours-time-part" : "data-shift-time-part";
      return `
        <div class="split-time-control ${mode === "shift" ? "shift-time-control" : ""}" aria-label="${label}">
          <select ${baseAttributes} ${partAttribute}="hour" ${disabledAttribute} aria-label="${label} hour">
            ${renderNumberOptions(1, 12, parts.hour)}
          </select>
          <select ${baseAttributes} ${partAttribute}="minute" ${disabledAttribute} aria-label="${label} minute">
            ${renderNumberOptions(0, 59, parts.minute)}
          </select>
          <select ${baseAttributes} ${partAttribute}="period" ${disabledAttribute} aria-label="${label} AM PM">
            <option value="AM" ${parts.period === "AM" ? "selected" : ""}>AM</option>
            <option value="PM" ${parts.period === "PM" ? "selected" : ""}>PM</option>
          </select>
        </div>
      `;
    }

    function readSplitTimeValue(container, fieldAttribute, partAttribute, fieldName, dayOfWeek = null) {
      const controls = $$(`[${fieldAttribute}="${fieldName}"]`, container)
        .filter(control => dayOfWeek === null || Number(control.dataset.dayOfWeek) === Number(dayOfWeek));
      const hour = controls.find(control => control.getAttribute(partAttribute) === "hour")?.value;
      const minute = controls.find(control => control.getAttribute(partAttribute) === "minute")?.value;
      const period = controls.find(control => control.getAttribute(partAttribute) === "period")?.value;
      return composeTimeValue(hour, minute, period);
    }

    function timeToMinutes(value) {
      if (!value || !value.includes(":")) return null;
      const [hour, minute] = value.split(":").map(Number);
      return hour * 60 + minute;
    }

    function minutesToTimeValue(minutes) {
      const normalized = Math.max(0, Math.min(23 * 60 + 30, minutes));
      const hour = String(Math.floor(normalized / 60)).padStart(2, "0");
      const minute = String(normalized % 60).padStart(2, "0");
      return `${hour}:${minute}`;
    }

    function weekDayLabel(value) {
      const labels = {
        "1": "Monday",
        "2": "Tuesday",
        "3": "Wednesday",
        "4": "Thursday",
        "5": "Friday",
        "6": "Saturday",
        "7": "Sunday"
      };
      return labels[value] || "";
    }

    function getOperationalWindow(location) {
      const openRows = operatingHoursForLocation(location).filter(row => row.isOpen && row.operationalOpen && row.operationalClose);
      if (!openRows.length) return null;
      const first = openRows[0];
      return {
        open: first.operationalOpen,
        close: first.operationalClose,
        openMinutes: timeToMinutes(first.operationalOpen),
        closeMinutes: timeToMinutes(first.operationalClose)
      };
    }

    function getOfficialWindow(location) {
      const openRows = operatingHoursForLocation(location).filter(row => row.isOpen && row.officialOpen && row.officialClose);
      if (!openRows.length) return null;
      const first = openRows[0];
      return {
        open: first.officialOpen,
        close: first.officialClose,
        openMinutes: timeToMinutes(first.officialOpen),
        closeMinutes: timeToMinutes(first.officialClose)
      };
    }

    function getKeyholderOptions(locationId, excludedEmployeeId = "") {
      return keyholderEmployees.filter(employee =>
        employee.locationId === locationId &&
        employee.status === "Active" &&
        employee.keyholderEligible &&
        employee.id !== excludedEmployeeId
      );
    }

    function renderKeyholderOptions(select, employees, placeholder, selectedValue = "") {
      select.innerHTML = [
        `<option value="">${placeholder}</option>`,
        ...employees.map(employee => `<option value="${employee.id}" ${employee.id === selectedValue ? "selected" : ""}>${employee.id} - ${employee.name}</option>`)
      ].join("");
    }

    function generateShiftPolicyId() {
      const maxId = subLocations
        .flatMap(location => location.shifts.map(shift => shift[0]))
        .map(id => Number(String(id).replace(/\D/g, "")))
        .filter(Number.isFinite)
        .reduce((max, value) => Math.max(max, value), 1400);
      return `SFP${maxId + 1}`;
    }

    function syncShiftTimeField(fieldName) {
      const targetId = fieldName === "shift_start_time" ? "shiftStartTime" : "shiftEndTime";
      const containerId = fieldName === "shift_start_time" ? "shiftStartTimeParts" : "shiftEndTimeParts";
      const container = $(`#${containerId}`);
      if (!container) return;
      $(`#${targetId}`).value = readSplitTimeValue(container, "data-shift-time-field", "data-shift-time-part", fieldName);
    }

    function syncShiftTimeFields() {
      syncShiftTimeField("shift_start_time");
      syncShiftTimeField("shift_end_time");
    }

    function setShiftTimeControls(startValue, endValue) {
      $("#shiftStartTime").value = startValue;
      $("#shiftEndTime").value = endValue;
      $("#shiftStartTimeParts").innerHTML = renderSplitTimeControl({
        value: startValue,
        field: "shift_start_time",
        label: "Shift Start Time",
        mode: "shift"
      });
      $("#shiftEndTimeParts").innerHTML = renderSplitTimeControl({
        value: endValue,
        field: "shift_end_time",
        label: "Shift End Time",
        mode: "shift"
      });
      updateShiftPolicyCalculations();
    }

    function updateShiftPolicyCalculations() {
      syncShiftTimeFields();
      const start = timeToMinutes($("#shiftStartTime").value);
      const end = timeToMinutes($("#shiftEndTime").value);
      const breakMinutes = Number($("#shiftBreakMinutes").value || 0);
      const totalHours = start !== null && end !== null && end > start ? (end - start) / 60 : 0;
      const netHours = Math.max(0, totalHours - breakMinutes / 60);
      $("#shiftTotalHours").value = totalHours.toFixed(2);
      $("#shiftNetHours").value = netHours.toFixed(2);
    }

    function updateShiftWeeklyOffControls() {
      const pattern = $("#shiftWeeklyOffPattern").value;
      const daySelect = $("#shiftWeeklyOffDay");
      const isFixed = pattern === "Fixed";
      daySelect.disabled = !isFixed;
      if (!isFixed) {
        daySelect.value = "";
        daySelect.removeAttribute("aria-invalid");
      }
    }

    function updateShiftKeyholderControls() {
      const location = getSelectedLocation();
      const primarySelect = $("#shiftPrimaryKeyholder");
      const backupSelect = $("#shiftBackupKeyholder");
      const primaryValue = primarySelect.value;
      const backupValue = backupSelect.value;
      $("#keyholderRequiredYes").classList.toggle("is-active", shiftPolicyKeyholderRequired);
      $("#keyholderRequiredNo").classList.toggle("is-active", !shiftPolicyKeyholderRequired);
      primarySelect.disabled = !shiftPolicyKeyholderRequired;
      backupSelect.disabled = !shiftPolicyKeyholderRequired;
      renderKeyholderOptions(primarySelect, getKeyholderOptions(location.id), "Select primary keyholder", primaryValue);
      renderKeyholderOptions(backupSelect, getKeyholderOptions(location.id, primarySelect.value), "Select backup keyholder", backupValue);
      if (!shiftPolicyKeyholderRequired) {
        primarySelect.value = "";
        backupSelect.value = "";
        primarySelect.removeAttribute("aria-invalid");
        backupSelect.removeAttribute("aria-invalid");
      }
      if (backupSelect.value && backupSelect.value === primarySelect.value) {
        backupSelect.value = "";
      }
    }

    function updateShiftCoverageRoleControls() {
      const role = $("#shiftCoverageRole").value;
      if (role !== "Fallback") return;
      const officialWindow = getOfficialWindow(getSelectedLocation());
      if (!$("#shiftPolicyName").value.trim()) {
        $("#shiftPolicyName").value = "Official Hours Coverage";
      }
      if (officialWindow) {
        setShiftTimeControls(officialWindow.open, officialWindow.close);
      }
      $("#shiftRequiredStaff").value = "1";
      $("#shiftDailyLeaveLimit").value = "0";
      $("#shiftWeeklyOffPattern").value = "Rotational";
      $("#shiftWeeklyOffDay").value = "";
      updateShiftWeeklyOffControls();
      updateShiftPolicyCalculations();
    }

    function clearShiftPolicyError() {
      $("#shiftPolicyError").classList.remove("is-visible");
      $$("[data-shift-field]").forEach(field => field.removeAttribute("aria-invalid"));
    }

    function showShiftPolicyError(message, fields = []) {
      $("#shiftPolicyErrorText").textContent = message;
      $("#shiftPolicyError").classList.add("is-visible");
      fields.forEach(field => field.setAttribute("aria-invalid", "true"));
      $("#shiftPolicyError").scrollIntoView({ behavior: "smooth", block: "center" });
      refreshIcons();
    }

    function resetShiftPolicyForm() {
      const location = getSelectedLocation();
      const window = getOperationalWindow(location);
      const isOffice = location.type === "Head Office";
      const startValue = window?.open || (isOffice ? "10:00" : "10:30");
      const endValue = minutesToTimeValue((timeToMinutes(startValue) || 0) + 9 * 60);
      $("#shiftPolicyId").value = "Auto-generated";
      $("#shiftPolicyName").value = "";
      $("#shiftPolicyStatus").value = "Active";
      $("#shiftCoverageRole").value = "Standard";
      setShiftTimeControls(startValue, endValue);
      $("#shiftBreakMinutes").value = "60";
      $("#shiftRequiredStaff").value = isOffice ? "5" : "4";
      $("#shiftDailyLeaveLimit").value = isOffice ? "2" : "1";
      $("#shiftWeeklyOffPattern").value = isOffice ? "Fixed" : "Rotational";
      $("#shiftWeeklyOffDay").value = isOffice ? "7" : "";
      $("#shiftMaxConsecutiveDays").value = "6";
      shiftPolicyKeyholderRequired = !isOffice;
      updateShiftPolicyCalculations();
      updateShiftWeeklyOffControls();
      updateShiftKeyholderControls();
      clearShiftPolicyError();
    }

    function openShiftPolicyModal() {
      const location = getSelectedLocation();
      resetShiftPolicyForm();
      $("#shiftPolicyLocationContext").textContent = `Location: ${location.name} (${location.id})`;
      $("#shiftPolicyModal").classList.add("is-open");
      $("#shiftPolicyName").focus();
      refreshIcons();
    }

    function closeShiftPolicyModal() {
      $("#shiftPolicyModal").classList.remove("is-open");
    }

    function collectShiftPolicyFormRecord() {
      return {
        policy_id: generateShiftPolicyId(),
        location_id: selectedLocationId,
        policy_name: $("#shiftPolicyName").value.trim(),
        coverage_role: $("#shiftCoverageRole").value,
        shift_start_time: $("#shiftStartTime").value,
        shift_end_time: $("#shiftEndTime").value,
        break_duration_minutes: Number($("#shiftBreakMinutes").value || 0),
        total_shift_hours: Number($("#shiftTotalHours").value || 0),
        net_work_hours: Number($("#shiftNetHours").value || 0),
        sanctioned_strength: Number($("#shiftRequiredStaff").value || 0),
        max_leave_per_day: Number($("#shiftDailyLeaveLimit").value || 0),
        keyholder_required: shiftPolicyKeyholderRequired,
        primary_keyholder_id: $("#shiftPrimaryKeyholder").value,
        backup_keyholder_id: $("#shiftBackupKeyholder").value,
        weekly_off_pattern: $("#shiftWeeklyOffPattern").value,
        weekly_off_day: $("#shiftWeeklyOffDay").value,
        max_consecutive_days: Number($("#shiftMaxConsecutiveDays").value || 0),
        policy_status: $("#shiftPolicyStatus").value
      };
    }

    function validateShiftPolicyRecord(record) {
      const fields = [];
      const addField = id => fields.push($(`#${id}`));
      const start = timeToMinutes(record.shift_start_time);
      const end = timeToMinutes(record.shift_end_time);
      const operationalWindow = getOperationalWindow(getSelectedLocation());

      if (!record.policy_name) addField("shiftPolicyName");
      if (!record.coverage_role) addField("shiftCoverageRole");
      if (!record.policy_status) addField("shiftPolicyStatus");
      if (!record.shift_start_time) addField("shiftStartTime");
      if (!record.shift_end_time) addField("shiftEndTime");
      if (!Number.isFinite(record.break_duration_minutes) || record.break_duration_minutes < 0) addField("shiftBreakMinutes");
      if (!Number.isInteger(record.sanctioned_strength) || record.sanctioned_strength <= 0) addField("shiftRequiredStaff");
      if (!Number.isInteger(record.max_leave_per_day) || record.max_leave_per_day < 0) addField("shiftDailyLeaveLimit");
      if (!Number.isInteger(record.max_consecutive_days) || record.max_consecutive_days <= 0) addField("shiftMaxConsecutiveDays");
      if (record.keyholder_required && !record.primary_keyholder_id) addField("shiftPrimaryKeyholder");
      if (record.weekly_off_pattern === "Fixed" && !record.weekly_off_day) addField("shiftWeeklyOffDay");
      if (record.weekly_off_pattern === "Rotational" && record.weekly_off_day) addField("shiftWeeklyOffDay");
      if (record.keyholder_required && record.backup_keyholder_id && record.backup_keyholder_id === record.primary_keyholder_id) addField("shiftBackupKeyholder");

      if (record.coverage_role === "Fallback" && getSelectedLocation().shifts.some(shift => isFallbackShift(shift))) {
        return { valid: false, message: "This location already has a fallback official-hours shift policy.", fields: [$("#shiftCoverageRole")] };
      }

      if (record.coverage_role === "Fallback" && !getOfficialWindow(getSelectedLocation())) {
        return { valid: false, message: "Configure location official hours before creating a fallback shift policy.", fields: [$("#shiftCoverageRole"), $("#shiftStartTime"), $("#shiftEndTime")] };
      }

      if (fields.length) {
        return { valid: false, message: "Complete the required shift policy fields before creating the policy.", fields };
      }

      if (start === null || end === null || end <= start) {
        return { valid: false, message: "Shift End Time must be after Shift Start Time.", fields: [$("#shiftStartTime"), $("#shiftEndTime")] };
      }

      if (!operationalWindow) {
        return { valid: false, message: "Configure location operational hours before creating a shift policy.", fields: [$("#shiftStartTime"), $("#shiftEndTime")] };
      }

      if (start < operationalWindow.openMinutes || end > operationalWindow.closeMinutes) {
        return {
          valid: false,
          message: `Shift timing must fit inside operational hours ${formatHourRange(operationalWindow.open, operationalWindow.close)}.`,
          fields: [$("#shiftStartTime"), $("#shiftEndTime")]
        };
      }

      if (record.break_duration_minutes / 60 > record.total_shift_hours) {
        return { valid: false, message: "Break duration cannot exceed total shift duration.", fields: [$("#shiftBreakMinutes")] };
      }

      if (record.net_work_hours < 0) {
        return { valid: false, message: "Net Work Hours cannot be negative.", fields: [$("#shiftBreakMinutes")] };
      }

      return { valid: true };
    }

    function createShiftPolicy(record) {
      const location = getSelectedLocation();
      const weeklyOff = record.weekly_off_pattern === "Fixed" ? weekDayLabel(record.weekly_off_day) : "Rotational";
      location.shifts.push([
        record.policy_id,
        record.policy_name,
        formatHourRange(record.shift_start_time, record.shift_end_time),
        String(record.sanctioned_strength),
        weeklyOff,
        record.policy_status,
        record.coverage_role || "Standard"
      ]);
      location.shiftPolicyRecords = [...(location.shiftPolicyRecords || []), { ...record }];
      renderLocationTab();
      closeShiftPolicyModal();
      showToast(`${record.policy_name} created for ${location.listName}.`);
    }

    function isoDateValue(date) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function formatShortDate(value) {
      const date = new Date(`${value}T00:00:00`);
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }

    function defaultRosterWeek() {
      const start = new Date("2026-06-22T00:00:00");
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: isoDateValue(start), end: isoDateValue(end) };
    }

    function populateRosterLocations(selectedId = selectedLocationId, locked = false) {
      const select = $("#rosterLocation");
      select.innerHTML = subLocations.map(location => `
        <option value="${location.id}" ${location.id === selectedId ? "selected" : ""}>${location.name} (${location.id})</option>
      `).join("");
      select.value = selectedId;
      select.disabled = locked;
      $("#rosterLocationHelp").textContent = locked
        ? "Location is inherited from the selected Sub Location workspace."
        : "Roster is always generated location-wise.";
    }

    function setRosterGenerateStep(step) {
      const isReview = step === 2;
      $("#rosterGenerateStepSetup").classList.toggle("is-active", !isReview);
      $("#rosterGenerateStepReview").classList.toggle("is-active", isReview);
      $("#rosterStepOneActions").hidden = isReview;
      $("#rosterStepTwoActions").hidden = !isReview;
      $("#rosterGenerateProgress").textContent = isReview
        ? "Step 2 of 2: Review Generated Roster"
        : "Step 1 of 2: Setup Generation";
      $("#publishRoster").hidden = !isReview || rosterGeneratedSetup?.output !== "publish";
      $("#confirmRosterDraft").innerHTML = `<i data-lucide="save"></i>${rosterGeneratedSetup?.output === "publish" ? "Save as Draft" : "Confirm Draft"}`;
      refreshIcons();
    }

    function openRosterGenerateModal({ lockedLocation = false } = {}) {
      const selectedId = selectedLocationId || subLocations[0].id;
      const week = defaultRosterWeek();
      rosterGeneratedSetup = null;
      rosterGeneratedResult = null;
      populateRosterLocations(selectedId, lockedLocation);
      $("#rosterStartDate").value = week.start;
      $("#rosterEndDate").value = week.end;
      $("#rosterWeekHelp").textContent = `${formatShortDate(week.start)} to ${formatShortDate(week.end)}.`;
      $('[name="rosterGenerationType"][value="new_draft"]').checked = true;
      $('[name="rosterPreferenceHandling"][value="respect"]').checked = true;
      $('[name="rosterLeaveHandling"][value="approved"]').checked = true;
      $('[name="rosterOutput"][value="draft"]').checked = true;
      setRosterGenerateStep(1);
      $("#rosterGenerateModal").classList.add("is-open");
      $("#rosterStartDate").focus();
      refreshIcons();
    }

    function closeRosterGenerateModal() {
      $("#rosterGenerateModal").classList.remove("is-open");
    }

    function collectRosterGenerateSetup() {
      return {
        locationId: $("#rosterLocation").value,
        startDate: $("#rosterStartDate").value,
        endDate: $("#rosterEndDate").value,
        generationType: $('[name="rosterGenerationType"]:checked').value,
        preferenceHandling: $('[name="rosterPreferenceHandling"]:checked').value,
        leaveHandling: $('[name="rosterLeaveHandling"]:checked').value,
        output: $('[name="rosterOutput"]:checked').value
      };
    }

    function validateRosterGenerateSetup(setup) {
      if (!setup.locationId || !setup.startDate || !setup.endDate) {
        return "Select location and roster date range before generation.";
      }
      if (new Date(setup.endDate) < new Date(setup.startDate)) {
        return "End date must be after Start Date.";
      }
      return "";
    }

    function generateRosterPreview(setup) {
      const location = subLocations.find(item => item.id === setup.locationId) || getSelectedLocation();
      const standardShifts = location.shifts.filter(shift => shift[5] === "Active" && !isFallbackShift(shift));
      const fallbackShift = fallbackShiftForLocation(location);
      const fallbackAvailable = Boolean(fallbackShift && fallbackShift[5] === "Active");
      const rosterDays = Math.max(1, Math.round((new Date(setup.endDate) - new Date(setup.startDate)) / 86400000) + 1);
      const openShiftDays = location.closedDay ? rosterDays - 1 : rosterDays;
      const keyholderCount = getKeyholderOptions(location.id).length;
      const employeePool = rosterBoardEmployees(location).length || keyholderEmployees.filter(employee => employee.locationId === location.id && employee.status === "Active").length;
      const unavailableEmployees = location.type === "Head Office" ? 0 : (setup.leaveHandling === "approved_pending" ? 2 : 1);
      const availableEmployees = Math.max(0, employeePool - unavailableEmployees);
      const fallbackUsed = fallbackAvailable && location.type !== "Head Office" && (!standardShifts.length || availableEmployees <= standardShifts.length);
      const generationShifts = fallbackUsed ? [fallbackShift] : standardShifts;
      const requiredSlots = generationShifts.reduce((total, shift) => total + Number(shift[3] || 0), 0) * openShiftDays;
      const openSlots = generationShifts.length
        ? fallbackUsed
          ? (availableEmployees && keyholderCount ? 0 : openShiftDays)
          : Math.max(0, Math.ceil(requiredSlots * 0.08) - (location.readiness > 85 ? 1 : 0))
        : Math.max(1, openShiftDays);
      const filledSlots = Math.max(0, requiredSlots - openSlots);
      const leaveConflicts = setup.leaveHandling === "approved_pending" ? 2 : 1;
      const preferenceMisses = setup.preferenceHandling === "respect" ? Math.max(fallbackUsed ? 1 : 0, openSlots) : 0;
      const conflicts = openSlots + leaveConflicts + (generationShifts.length ? 0 : 2) + (keyholderCount ? 0 : 1);
      const fallbackNote = fallbackUsed
        ? `Official hours fallback used because ${availableEmployees} available employee${availableEmployees === 1 ? "" : "s"} could not cover ${standardShifts.length || "normal"} active shift pattern${standardShifts.length === 1 ? "" : "s"}.`
        : fallbackAvailable
          ? "Official hours fallback is available if manpower drops below normal shift coverage."
          : "No fallback official-hours shift is available.";

      return {
        location,
        period: `${formatShortDate(setup.startDate)} - ${formatShortDate(setup.endDate)}`,
        summary: [
          ["Filled shifts", filledSlots, generationShifts.length ? `${generationShifts.length} shift ${generationShifts.length === 1 ? "pattern" : "patterns"} consumed` : "No usable shift policy found"],
          ["Open slots", openSlots, openSlots ? "Created where eligible staff is unavailable" : "No open staffing gaps"],
          ["Conflicts", conflicts, conflicts ? "Review required before publish" : "No blocking conflict"],
          ["Leave conflicts", leaveConflicts, setup.leaveHandling === "approved_pending" ? "Pending leave treated as unavailable" : "Approved leave only"],
          ["Keyholder coverage", keyholderCount >= 2 ? "Satisfied" : "Needs review", `${keyholderCount} eligible keyholder${keyholderCount === 1 ? "" : "s"}`],
          ["Fallback mode", fallbackUsed ? "Used" : "Standby", fallbackNote],
          ["Preference matches", setup.preferenceHandling === "respect" ? `${Math.max(0, availableEmployees - preferenceMisses)} / ${availableEmployees}` : "Ignored", setup.preferenceHandling === "respect" ? `${preferenceMisses} preference miss${preferenceMisses === 1 ? "" : "es"}` : "Preference rules skipped"],
          ["Employees excluded", leaveConflicts + 2, "Reasons listed below"]
        ],
        coverage: generationShifts.length
          ? [
            ...(fallbackUsed ? [{
              title: `${fallbackShift[1]} | ${fallbackShift[2]}`,
              detail: "Generated from Location Official Timing because normal shift coverage was not possible.",
              tone: "green",
              status: "Fallback Used"
            }] : generationShifts.map(shift => ({
              title: `${shift[1]} | ${shift[2]}`,
              detail: `${shift[3]} required staff per day, ${shift[4]} weekly off method, ${shift[5]} policy`,
              tone: "green",
              status: "Checked"
            }))),
            ...(fallbackUsed ? standardShifts.map(shift => ({
              title: `${shift[1]} | ${shift[2]}`,
              detail: "Normal shift pattern kept on standby for days with enough employees.",
              tone: "grey",
              status: "Standby"
            })) : fallbackAvailable ? [{
              title: `${fallbackShift[1]} | ${fallbackShift[2]}`,
              detail: "Available as fallback if employee availability drops below normal coverage.",
              tone: "blue",
              status: "Standby"
            }] : [])
          ]
          : [{ title: "No active shift policy", detail: "Create or activate Location Shift Policy before final roster publication." }],
        conflicts: [
          ...(fallbackUsed ? [{ title: "Fallback coverage satisfied", detail: fallbackNote }] : []),
          { title: openSlots ? `${openSlots} open slot${openSlots === 1 ? "" : "s"} created` : "No open slots", detail: openSlots ? "System could not assign valid employees without breaking configured rules." : "All required shift positions were filled." },
          { title: keyholderCount >= 2 ? "Keyholder coverage satisfied" : "Keyholder backup missing", detail: keyholderCount >= 2 ? "Primary and backup keyholder pool is available." : "Add backup keyholder eligibility before publishing store roster." },
          { title: `${leaveConflicts} leave conflict${leaveConflicts === 1 ? "" : "s"}`, detail: setup.leaveHandling === "approved_pending" ? "Approved and pending leave were both blocked." : "Only approved leave blocked assignment." }
        ],
        excluded: [
          ...(fallbackUsed ? [{ title: "Normal shift split", detail: "Opening and Closing patterns were bypassed for shortage days; Official Hours Coverage was selected instead." }] : []),
          { title: "Tania Biswas", detail: "Approved leave overlaps selected roster week." },
          { title: "Amit Das", detail: "Preferred week off and max continuous days limit created a conflict." },
          { title: location.type === "Head Office" ? "Rohan Dutta" : "Service trainee pool", detail: location.type === "Head Office" ? "Inactive attendance status for the generation period." : "Missing required skill for grooming or clinic coverage." }
        ]
      };
    }

    function renderRosterReview(result) {
      $("#rosterReviewSummary").innerHTML = result.summary.map(item => `
        <article class="roster-result-card">
          <div class="result-label">${item[0]}</div>
          <div class="result-value">${item[1]}</div>
          <div class="result-note">${item[2]}</div>
        </article>
      `).join("");
      $("#rosterCoverageList").innerHTML = result.coverage.map(item => `
        <li><span>${item.title}<br><small>${item.detail}</small></span><span class="badge ${item.tone || "green"}">${item.status || "Checked"}</span></li>
      `).join("");
      $("#rosterConflictList").innerHTML = result.conflicts.map(item => {
        const tone = item.title.includes("No ") || item.title.includes("satisfied") ? "green" : "amber";
        return `<li><span>${item.title}<br><small>${item.detail}</small></span><span class="badge ${tone}">${tone === "green" ? "Ready" : "Review"}</span></li>`;
      }).join("");
      $("#rosterExcludedList").innerHTML = result.excluded.map(item => `
        <li><span>${item.title}<br><small>${item.detail}</small></span><span class="badge grey">Excluded</span></li>
      `).join("");
      refreshIcons();
    }

    function validateOperatingHourRow(row) {
      if (!row.isOpen) {
        return { valid: true, status: "Closed", message: "" };
      }

      const values = [row.officialOpen, row.officialClose, row.operationalOpen, row.operationalClose];
      if (values.some(value => !value)) {
        return {
          valid: false,
          status: "Missing Hours",
          message: "Complete all four time fields for an open day."
        };
      }

      const officialOpen = timeToMinutes(row.officialOpen);
      const officialClose = timeToMinutes(row.officialClose);
      const operationalOpen = timeToMinutes(row.operationalOpen);
      const operationalClose = timeToMinutes(row.operationalClose);

      if (officialOpen >= officialClose) {
        return {
          valid: false,
          status: "Invalid Order",
          message: "Official open time must be earlier than official close time."
        };
      }

      if (operationalOpen >= operationalClose) {
        return {
          valid: false,
          status: "Invalid Order",
          message: "Operational open time must be earlier than operational close time."
        };
      }

      const outsideOperationalHours = officialOpen < operationalOpen || officialClose > operationalClose;

      if (outsideOperationalHours) {
        return {
          valid: false,
          status: "Outside Range",
          message: "Official hours must remain within operational hours."
        };
      }

      return { valid: true, status: "Valid", message: "" };
    }

    function validateOperatingHours(records) {
      const results = records.map(row => ({ row, ...validateOperatingHourRow(row) }));
      const invalid = results.filter(result => !result.valid);
      return {
        valid: invalid.length === 0,
        results,
        message: invalid.length
          ? `${invalid.length} day${invalid.length === 1 ? "" : "s"} require correction before saving.`
          : "Official hours are within operational hours for every open day."
      };
    }

    function operatingHoursForLocation(location) {
      if (!location.operatingHoursRecords) {
        location.operatingHoursRecords = buildOperatingHourRecords(location);
      }
      return location.operatingHoursRecords;
    }

    function startHoursEdit() {
      const location = getSelectedLocation();
      hoursDraft = operatingHoursForLocation(location).map(row => ({ ...row }));
      hoursEditMode = true;
      renderLocationTab();
    }

    function cancelHoursEdit() {
      hoursEditMode = false;
      hoursDraft = null;
      renderLocationTab();
      showToast("Unsaved operating-hour changes were discarded.");
    }

    function saveHoursEdit() {
      const validation = validateOperatingHours(hoursDraft || []);
      if (!validation.valid) {
        renderLocationTab();
        showToast("Correct the operating-hour warnings before saving.");
        return;
      }

      const location = getSelectedLocation();
      location.operatingHoursRecords = hoursDraft.map(row => ({ ...row }));
      const firstOpenDay = location.operatingHoursRecords.find(row => row.isOpen);
      location.hoursConfigured = Boolean(firstOpenDay);
      location.officialHours = firstOpenDay
        ? formatHourRange(firstOpenDay.officialOpen, firstOpenDay.officialClose)
        : "Not configured";
      location.operationalHours = firstOpenDay
        ? formatHourRange(firstOpenDay.operationalOpen, firstOpenDay.operationalClose)
        : "Not configured";
      const closedDays = location.operatingHoursRecords.filter(row => !row.isOpen);
      location.closedDay = closedDays.length === 1 ? closedDays[0].dayName : null;
      hoursEditMode = false;
      hoursDraft = null;
      renderLocationTab();
      showToast(`${location.listName} operating hours saved.`);
    }

    function renderHoursTab(location) {
      const records = hoursEditMode
        ? hoursDraft
        : operatingHoursForLocation(location);
      const validation = validateOperatingHours(records);
      const actions = hoursEditMode
        ? `<button class="button" data-control-action="cancel-hours">Cancel</button>
           <button class="button primary" data-control-action="save-hours"><i data-lucide="save"></i>Save Hours</button>`
        : `<button class="button" data-control-action="copy-hours"><i data-lucide="copy"></i>Copy From</button>
           <button class="button primary" data-control-action="edit-hours"><i data-lucide="pencil"></i>Edit Hours</button>`;
      return `
        ${tabHeader(hoursEditMode ? "Editing Operating Hours" : "Operating Hours",
          "Official and operational hours for each day of the week.",
          actions)}
        <div class="control-table-wrap">
          <table class="control-table ${hoursEditMode ? "is-hours-editing" : ""}">
            <thead>
              ${hoursEditMode
                ? `<tr>
                    <th>Day of Week</th><th>Open?</th>
                    <th>Official Open Time</th><th>Official Close Time</th>
                    <th>Operational Open Time</th><th>Operational Close Time</th>
                    <th>Status</th><th class="action-cell">Action</th>
                  </tr>`
                : `<tr><th>Day of Week</th><th>Open?</th><th>Official Hours</th><th>Operational Hours</th><th>Status</th><th class="action-cell">Action</th></tr>`}
            </thead>
            <tbody>
              ${records.map(row => {
                const rowValidation = validateOperatingHourRow(row);
                const badgeTone = rowValidation.status === "Valid"
                  ? "green"
                  : rowValidation.status === "Closed"
                    ? "grey"
                    : "red";
                return `
                  <tr class="hours-row ${rowValidation.valid ? "" : "is-invalid"}" data-hours-day="${row.dayOfWeek}">
                    <td>${row.dayName}</td>
                    <td>
                      <button class="switch hours-switch ${row.isOpen ? "is-on" : ""}"
                        type="button"
                        ${hoursEditMode ? "" : "disabled"}
                        aria-label="${row.isOpen ? "Open" : "Closed"} on ${row.dayName}"
                        data-day-of-week="${row.dayOfWeek}"></button>
                    </td>
                    ${hoursEditMode
                      ? `
                        <td>${renderSplitTimeControl({ value: row.officialOpen, field: "officialOpen", dayOfWeek: row.dayOfWeek, disabled: !row.isOpen, label: `${row.dayName} official open time` })}</td>
                        <td>${renderSplitTimeControl({ value: row.officialClose, field: "officialClose", dayOfWeek: row.dayOfWeek, disabled: !row.isOpen, label: `${row.dayName} official close time` })}</td>
                        <td>${renderSplitTimeControl({ value: row.operationalOpen, field: "operationalOpen", dayOfWeek: row.dayOfWeek, disabled: !row.isOpen, label: `${row.dayName} operational open time` })}</td>
                        <td>${renderSplitTimeControl({ value: row.operationalClose, field: "operationalClose", dayOfWeek: row.dayOfWeek, disabled: !row.isOpen, label: `${row.dayName} operational close time` })}</td>
                      `
                      : `
                        <td>${row.isOpen ? formatHourRange(row.officialOpen, row.officialClose) : "Closed"}</td>
                        <td>${row.isOpen ? formatHourRange(row.operationalOpen, row.operationalClose) : "Closed"}</td>
                      `}
                    <td>
                      <span class="badge ${badgeTone}">${rowValidation.status}</span>
                      ${hoursEditMode && rowValidation.message ? `<div class="hours-row-error">${rowValidation.message}</div>` : ""}
                    </td>
                    <td class="action-cell">${hoursEditMode ? "—" : `<button class="row-menu-button" data-control-action="row-menu" aria-label="Actions for ${row.dayName}"><i data-lucide="ellipsis-vertical"></i></button>`}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
        <div class="validation-summary ${validation.valid ? "" : "is-error"}">
          <div class="validation-copy">
            <span class="validation-icon"><i data-lucide="${validation.valid ? "check" : "triangle-alert"}"></i></span>
            <div>
              <div class="validation-title">Validation Summary</div>
              <div class="validation-text">${validation.message}</div>
            </div>
          </div>
          ${hoursEditMode ? "" : `<button class="button" data-control-action="view-validation">View Details</button>`}
        </div>
      `;
    }

    function renderServicesTab(location) {
      return `
        ${tabHeader("Location Service Config", "Services currently configured for the selected location.",
          `<button class="button primary" data-control-action="add-service"><i data-lucide="plus"></i>Add Service Config</button>`)}
        ${location.services.length ? `
          <div class="control-table-wrap">
            <table class="control-table">
              <thead><tr><th>Service Code</th><th>Service</th><th>Service Mode</th><th>Status</th><th class="action-cell">Action</th></tr></thead>
              <tbody>
                ${location.services.map(service => `
                  <tr>
                    <td>${service[0]}</td><td>${service[1]}</td><td>${service[2]}</td>
                    <td><span class="badge ${statusClass[service[3]] || "grey"}">${service[3]}</span></td>
                    <td class="action-cell"><button class="row-menu-button" data-control-action="row-menu" aria-label="Actions for ${service[1]}"><i data-lucide="ellipsis-vertical"></i></button></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>` : `<div class="location-empty">No location service configuration applies to this office.</div>`}
      `;
    }

    function renderDeliveryTab(location) {
      return `
        ${tabHeader("Delivery Zone", "Delivery zones configured for the selected location.",
          `<button class="button primary" data-control-action="add-zone"><i data-lucide="plus"></i>Add Delivery Zone</button>`)}
        ${location.deliveryZones.length ? `
          <div class="control-table-wrap">
            <table class="control-table">
              <thead><tr><th>Zone ID</th><th>Zone Name</th><th>Service Radius</th><th>Coverage</th><th>Status</th><th class="action-cell">Action</th></tr></thead>
              <tbody>
                ${location.deliveryZones.map(zone => `
                  <tr>
                    ${zone.map((cell, index) => `<td>${index === 4 ? `<span class="badge ${statusClass[cell] || "grey"}">${cell}</span>` : cell}</td>`).join("")}
                    <td class="action-cell"><button class="row-menu-button" data-control-action="row-menu" aria-label="Delivery zone actions"><i data-lucide="ellipsis-vertical"></i></button></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>` : `<div class="location-empty">No delivery zone is configured for this location.</div>`}
      `;
    }

    function renderOnboardingTab(location) {
      const complete = location.readiness >= 80;
      const rows = [
        ["Location Record", "HR & Admin", "Completed"],
        ["Operating Hours", "Operations", "Completed"],
        ["Service Configuration", "Operations", location.services.length || location.type === "Head Office" ? "Completed" : "In Progress"],
        ["Shift Policy", "HR & Admin", location.shifts.length ? "Completed" : "In Progress"],
        ["Roster Readiness", "Location Manager", complete ? "Completed" : "In Progress"]
      ];
      return `
        ${tabHeader("Location Onboarding Checklist", "Setup readiness for the selected location.",
          `<button class="button" data-control-action="refresh-checklist"><i data-lucide="refresh-cw"></i>Refresh Status</button>`)}
        <div class="control-table-wrap">
          <table class="control-table">
            <thead><tr><th>Setup Area</th><th>Owner</th><th>Completion</th><th>Status</th><th class="action-cell">Action</th></tr></thead>
            <tbody>
              ${rows.map((row, index) => `
                <tr>
                  <td><span class="check-cell"><span class="check-icon ${row[2] === "Completed" ? "" : "pending"}"><i data-lucide="${row[2] === "Completed" ? "check" : "clock-3"}"></i></span>${row[0]}</span></td>
                  <td>${row[1]}</td>
                  <td>${row[2] === "Completed" ? "100%" : `${Math.max(40, location.readiness - index * 4)}%`}</td>
                  <td><span class="badge ${statusClass[row[2]] || "grey"}">${row[2]}</span></td>
                  <td class="action-cell"><button class="row-menu-button" data-control-action="row-menu" aria-label="Checklist actions"><i data-lucide="ellipsis-vertical"></i></button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    function renderShiftPolicyTab(location) {
      const rows = shiftRowsForLocation(location);
      const fallback = fallbackShiftForLocation(location);
      return `
        ${tabHeader("Location Shift Policy", "Shift policies assigned to the selected location.",
          `<button class="button primary" data-control-action="add-shift-policy"><i data-lucide="plus"></i>Add Shift Policy</button>`)}
        <div class="control-table-wrap">
          <table class="control-table">
            <thead><tr><th>Policy ID</th><th>Shift</th><th>Timing</th><th>Sanctioned Strength</th><th>Weekly Off</th><th>Coverage Role</th><th>Status</th><th class="action-cell">Action</th></tr></thead>
            <tbody>
              ${rows.map(shift => `
                <tr>
                  <td>${shift[0]}</td>
                  <td>${shift[1]}</td>
                  <td>${shift[2]}</td>
                  <td>${shift[3]}</td>
                  <td>${shift[4]}</td>
                  <td><span class="badge ${shiftCoverageRole(shift) === "Fallback" ? "blue" : "grey"}">${shiftCoverageRole(shift)}</span></td>
                  <td><span class="badge ${statusClass[shift[5]] || "grey"}">${shift[5]}</span></td>
                  <td class="action-cell"><button class="row-menu-button" data-control-action="row-menu" aria-label="Shift policy actions"><i data-lucide="ellipsis-vertical"></i></button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ${fallback ? `
          <div class="validation-summary is-info">
            <div class="validation-copy">
              <span class="validation-icon"><i data-lucide="route"></i></span>
              <div>
                <div class="validation-title">Fallback Coverage Enabled</div>
                <div class="validation-text">If normal shift coverage cannot be met, roster generation can use ${fallback[1]} (${fallback[2]}) for this location.</div>
              </div>
            </div>
          </div>
        ` : ""}
      `;
    }

    function renderLocationAuditTab(location) {
      const rows = [
        ["15 Jun 2026, 12:06 AM", "Vikram Admin", "Sub Location", `Opened ${location.listName} control center`, "Posted"],
        ["14 Jun 2026, 09:42 PM", "HR Admin", "Operating Hours", "Reviewed weekly operating hours", "Approved"],
        ["14 Jun 2026, 08:15 PM", "Operations Admin", "Shift Policy", "Updated roster generation settings", "Override"],
        ["12 Jun 2026, 04:30 PM", "System", "Onboarding Checklist", "Recalculated location readiness", "Posted"]
      ];
      return `
        ${tabHeader("Audit Log", "Recent setup activity for the selected location.",
          `<button class="button" data-control-action="export-audit"><i data-lucide="download"></i>Export Audit</button>`)}
        <div class="control-table-wrap">
          <table class="control-table">
            <thead><tr><th>Timestamp</th><th>Actor</th><th>Area</th><th>Action</th><th>Status</th></tr></thead>
            <tbody>
              ${rows.map(row => `<tr>${row.map((cell, index) => `<td>${index === 4 ? `<span class="badge ${statusClass[cell] || "grey"}">${cell}</span>` : cell}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    function renderLocationTab() {
      const location = getSelectedLocation();
      const renderers = {
        overview: renderOverviewTab,
        hours: renderHoursTab,
        services: renderServicesTab,
        delivery: renderDeliveryTab,
        onboarding: renderOnboardingTab,
        "shift-policy": renderShiftPolicyTab,
        audit: renderLocationAuditTab
      };
      $("#locationTabContent").innerHTML = renderers[activeLocationTab](location);
      $$(".location-tab").forEach(tab => tab.classList.toggle("is-active", tab.dataset.locationTab === activeLocationTab));
      refreshIcons();
    }

    function renderLocationControl() {
      const location = getSelectedLocation();
      renderLocationKpis();
      renderLocationList();
      renderLocationMeta(location);
      renderLocationTab();
    }

    function emptyLocationRecord() {
      return {
        location_id: "",
        parent_entity_id: "",
        location_name: "",
        brand_flag: "",
        location_type: "",
        address_line1: "",
        city: "",
        pincode: "",
        state: "",
        state_code: "",
        latitude: "",
        longitude: "",
        phone: "",
        email: "",
        cost_centre_code: "",
        area_manager_id: "",
        primary_keyholder_id: "",
        backup_keyholder_id: "",
        onboarding_status: "",
        status: ""
      };
    }

    function clearLocationFormError() {
      $("#locationFormError").classList.remove("is-visible");
      $$("[data-location-field]").forEach(field => field.removeAttribute("aria-invalid"));
    }

    function showLocationFormError(message, fields = []) {
      $("#locationFormErrorText").textContent = message;
      $("#locationFormError").classList.add("is-visible");
      fields.forEach(field => field.setAttribute("aria-invalid", "true"));
      $("#locationFormError").scrollIntoView({ behavior: "smooth", block: "center" });
      refreshIcons();
    }

    function populateLocationForm(record) {
      clearLocationFormError();
      $$("[data-location-field]").forEach(field => {
        field.value = record[field.dataset.locationField] ?? "";
      });
      setLocationStep(0);
    }

    function collectLocationFormRecord() {
      return $$("[data-location-field]").reduce((record, field) => {
        record[field.dataset.locationField] = field.value.trim();
        return record;
      }, {});
    }

    function buildLocationFromRecord(record) {
      const location = {
        id: record.location_id,
        name: record.brand_flag || record.location_name,
        listName: record.location_name,
        parent: parentEntities[record.parent_entity_id] || record.parent_entity_id,
        parentCode: record.parent_entity_id,
        state: record.state || "Not set",
        type: locationTypeLabel(record.location_type),
        status: titleCaseValue(record.status),
        readiness: 20,
        readinessLabel: titleCaseValue(record.onboarding_status),
        readinessTone: "attention",
        officialHours: "Not configured",
        operationalHours: "Not configured",
        closedDay: null,
        hoursConfigured: false,
        services: [],
        deliveryZones: [],
        shifts: [],
        record: { ...record }
      };
      location.operatingHoursRecords = buildOperatingHourRecords(location);
      return location;
    }

    function applyLocationRecord(location, record) {
      location.id = record.location_id;
      location.name = record.brand_flag || record.location_name;
      location.listName = record.location_name;
      location.parent = parentEntities[record.parent_entity_id] || record.parent_entity_id;
      location.parentCode = record.parent_entity_id;
      location.state = record.state || "Not set";
      location.type = locationTypeLabel(record.location_type);
      location.status = titleCaseValue(record.status);
      location.record = { ...record };
    }

    function setLocationFormHeader(mode) {
      const isEdit = mode === "edit";
      setBreadcrumb(["HRMS", "Organization", "Sub Location Control Center", isEdit ? "Edit Location" : "Add New Location"]);
      $("#pageTitle").textContent = isEdit ? "Edit Sub Location" : "Create New Sub Location";
      $("#pageDescription").textContent = isEdit
        ? "Update the existing base location record. Related location setup remains available in the Sub Location Control Center."
        : "Create the base location record before configuring operating hours, services, delivery zones, onboarding checklist and location shift policy.";
      $(".page-actions").classList.add("is-form-page");
      $("#exportButton").style.display = "none";
      $("#primaryAction").className = "button";
      $("#primaryAction").innerHTML = `<i data-lucide="arrow-left"></i>Back to Sub Location Control Center`;
      $("#modalTitle").textContent = isEdit ? "Edit Sub Location" : "Create New Sub Location";
      $("#modalSubtitle").textContent = "Sub Location Master";
    }

    function openLocationForm(mode) {
      locationFormMode = mode;
      editingLocationId = mode === "edit" ? selectedLocationId : null;
      activePage = "sub-location-form";
      $$(".nav-single, .nav-child").forEach(button => button.classList.remove("is-active"));
      const target = $('.nav-child[data-page="sub-location"]');
      target.classList.add("is-active");
      openGroup(target.closest(".nav-group"), true);
      $("#dashboardView").classList.remove("is-active");
      $("#locationControlView").classList.remove("is-active");
      $("#moduleView").classList.remove("is-active");
      $("#entityFormView").classList.remove("is-active");
      $("#employeeFormView").classList.remove("is-active");
      $("#locationFormView").classList.add("is-active");
      setLocationFormHeader(mode);
      const record = mode === "edit"
        ? { ...emptyLocationRecord(), ...getSelectedLocation().record }
        : emptyLocationRecord();
      populateLocationForm(record);
      $("#submitLocationForm").innerHTML = `<i data-lucide="save"></i>${mode === "edit" ? "Save Changes" : "Create Location"}`;
      closeMobileMenu();
      window.scrollTo({ top: 0, behavior: "smooth" });
      refreshIcons();
    }

    function setLocationStep(stepIndex) {
      activeLocationStep = Math.max(0, Math.min(3, stepIndex));
      $$("#locationStepper [data-location-step]").forEach((step, index) => {
        step.classList.toggle("is-active", index === activeLocationStep);
        step.classList.toggle("is-complete", index < activeLocationStep);
      });
      $$("[data-location-section]").forEach((section, index) => {
        section.classList.toggle("is-active", index === activeLocationStep);
      });
      $("#backLocationStep").disabled = activeLocationStep === 0;
      $("#nextLocationStep").hidden = activeLocationStep === 3;
      $("#submitLocationForm").hidden = activeLocationStep !== 3;
      clearLocationFormError();
      refreshIcons();
    }

    function validateLocationRecord(record) {
      const requiredFields = $$("[data-location-field][required]");
      const missing = requiredFields.filter(field => !record[field.dataset.locationField]);
      if (missing.length) {
        return {
          valid: false,
          message: "Complete all required location fields before saving.",
          fields: missing
        };
      }

      const emailField = $('[data-location-field="email"]');
      if (record.email && !emailField.validity.valid) {
        return {
          valid: false,
          message: "Enter a valid email address.",
          fields: [emailField]
        };
      }

      const duplicate = subLocations.find(location =>
        location.id.toLowerCase() === record.location_id.toLowerCase()
        && location.id !== editingLocationId
      );
      if (duplicate) {
        return {
          valid: false,
          message: `Location ID ${record.location_id} already exists.`,
          fields: [$('[data-location-field="location_id"]')]
        };
      }

      return { valid: true, message: "", fields: [] };
    }

    function emptyEntityRecord() {
      return {
        entity_id: "",
        legal_name: "",
        entity_type: "",
        entity_role: "",
        gstin: "",
        gst_type: "",
        pan_number: "",
        cin_number: "",
        phone: "",
        email: "",
        address_line1: "",
        address_line2: "",
        city: "",
        pincode: "",
        state: "",
        country: "India",
        commission_on_products: "0",
        commission_on_services: "0",
        status: "Active"
      };
    }

    function generateEntityId(record) {
      const prefix = record.entity_role === "HQ" ? "IPL" : record.entity_type === "Partnership" ? "PCP" : record.entity_type === "Proprietorship" ? "SCP" : "HPR";
      const existingNumbers = pageConfig["entity-master"].rows
        .map(row => Number(String(row[0]).replace(/\D/g, "")))
        .filter(Number.isFinite);
      const next = Math.max(100, ...existingNumbers) + 1;
      return `${prefix}${next}`;
    }

    function populateEntityForm(record = emptyEntityRecord()) {
      clearEntityFormError();
      $$("[data-entity-field]").forEach(field => {
        field.value = record[field.dataset.entityField] ?? "";
      });
      populateEntityRoleMasterOptions();
      resetEntityAccessFields();
      updateEntityAccessState();
      renderEntityLinkedLocations();
      setEntityStep(0);
    }

    function populateEntityRoleMasterOptions() {
      const source = $('[data-employee-field="role_id"]');
      const target = $('[data-entity-access-field="role_id"]');
      if (!source || !target) return;

      const options = Array.from(source.options)
        .filter(option => option.value)
        .map(option => ({ value: option.value, label: option.textContent.trim() }));

      target.replaceChildren(new Option("Select role from Role Master", ""));
      options.forEach(option => target.add(new Option(option.label, option.value)));
    }

    function entityLoginAccessRequired() {
      const entityRole = $('[data-entity-field="entity_role"]').value;
      return entityRole === "Franchisee" || entityRole === "Branch";
    }

    function resetEntityAccessFields() {
      $$("[data-entity-access-field]").forEach(field => {
        field.value = field.dataset.entityAccessField === "login_status" ? "Active" : "";
        field.removeAttribute("aria-invalid");
      });
    }

    function updateEntityAccessState() {
      const entityRole = $('[data-entity-field="entity_role"]').value;
      const accessRequired = entityLoginAccessRequired();
      const fieldset = $("#entityAccessFieldset");
      const context = $("#entityAccessContext");
      const contextTitle = $("#entityAccessContextTitle");
      const contextCopy = $("#entityAccessContextCopy");

      fieldset.disabled = !accessRequired;
      context.classList.toggle("is-disabled", !accessRequired);

      $$(".entity-access-field-state").forEach(state => {
        state.textContent = accessRequired ? "Required" : "Not required";
        state.classList.toggle("required", accessRequired);
      });

      $$("[data-entity-access-field]").forEach(field => {
        field.required = accessRequired;
        if (!accessRequired) field.removeAttribute("aria-invalid");
      });

      if (accessRequired) {
        contextTitle.textContent = `ERP access required for ${entityRole}`;
        contextCopy.textContent = "Complete the login fields below. Access permissions come from the selected Role Master record.";
      } else if (entityRole) {
        contextTitle.textContent = `ERP login access is not required for ${entityRole}`;
        contextCopy.textContent = "This step remains part of the workflow, but its fields are disabled for the selected entity role.";
        resetEntityAccessFields();
      } else {
        contextTitle.textContent = "Select an entity role in Overview";
        contextCopy.textContent = "Login fields become available when the entity role is Franchisee or Branch.";
        resetEntityAccessFields();
      }

      refreshIcons();
    }

    function collectEntityFormRecord() {
      return $$("[data-entity-field]").reduce((record, field) => {
        record[field.dataset.entityField] = field.value.trim();
        return record;
      }, emptyEntityRecord());
    }

    function renderEntityLinkedLocations() {
      $("#entityLinkedLocations").innerHTML = subLocations.map(location => `
        <label class="entity-linked-option">
          <input type="checkbox" data-entity-location-link="${location.id}">
          <span>
            <span class="entity-linked-name">${location.listName}</span>
            <span class="entity-linked-meta">${location.id} · Current parent ${location.parentCode}</span>
          </span>
          <span class="badge ${statusClass[location.status] || "grey"}">${location.status}</span>
        </label>
      `).join("");
    }

    function setEntityFormHeader() {
      setBreadcrumb(["HRMS", "Organization", "Entity Master", "Add New Entity"]);
      $("#pageTitle").textContent = "Add New Entity";
      $("#pageDescription").textContent = "Create a new legal or business entity that owns or operates locations.";
      $(".page-actions").classList.add("is-form-page");
      $("#exportButton").style.display = "none";
      $("#primaryAction").className = "button";
      $("#primaryAction").innerHTML = `<i data-lucide="arrow-left"></i>Back to Entity Control Center`;
    }

    function openEntityForm() {
      activePage = "entity-master-form";
      activeEntityStep = 0;
      $$(".nav-single, .nav-child").forEach(button => button.classList.remove("is-active"));
      const target = $('.nav-child[data-page="entity-master"]');
      target.classList.add("is-active");
      openGroup(target.closest(".nav-group"), true);
      $("#dashboardView").classList.remove("is-active");
      $("#locationControlView").classList.remove("is-active");
      $("#locationFormView").classList.remove("is-active");
      $("#employeeFormView").classList.remove("is-active");
      $("#entityFormView").classList.remove("is-active");
      $("#moduleView").classList.remove("is-active");
      $("#entityFormView").classList.add("is-active");
      setEntityFormHeader();
      populateEntityForm();
      closeMobileMenu();
      window.scrollTo({ top: 0, behavior: "smooth" });
      refreshIcons();
    }

    function setEntityStep(stepIndex) {
      activeEntityStep = Math.max(0, Math.min(5, stepIndex));
      $$("#entityStepper [data-entity-step]").forEach((step, index) => {
        step.classList.toggle("is-active", index === activeEntityStep);
        step.classList.toggle("is-complete", index < activeEntityStep);
      });
      $$("[data-entity-section]").forEach((section, index) => {
        section.classList.toggle("is-active", index === activeEntityStep);
      });
      $("#backEntityStep").disabled = activeEntityStep === 0;
      $("#nextEntityStep").hidden = activeEntityStep === 5;
      $("#submitEntityForm").hidden = activeEntityStep !== 5;
      clearEntityFormError();
      refreshIcons();
    }

    function clearEntityFormError() {
      $("#entityFormError").classList.remove("is-visible");
      $$("[data-entity-field], [data-entity-access-field]").forEach(field => field.removeAttribute("aria-invalid"));
    }

    function showEntityFormError(message, fields = []) {
      $("#entityFormErrorText").textContent = message;
      $("#entityFormError").classList.add("is-visible");
      fields.forEach(field => field.setAttribute("aria-invalid", "true"));
      $("#entityFormError").scrollIntoView({ behavior: "smooth", block: "center" });
      refreshIcons();
    }

    function validateEntityRecord(record) {
      const requiredFields = $$("[data-entity-field][required]");
      const missing = requiredFields.filter(field => !record[field.dataset.entityField]);
      if (missing.length) {
        return {
          valid: false,
          message: "Complete all required entity fields before creating the entity.",
          fields: missing
        };
      }

      const emailField = $('[data-entity-field="email"]');
      if (record.email && !emailField.validity.valid) {
        return {
          valid: false,
          message: "Enter a valid email address.",
          fields: [emailField]
        };
      }

      return { valid: true, message: "", fields: [] };
    }

    function validateEntityAccess() {
      if (!entityLoginAccessRequired()) return { valid: true, message: "", fields: [] };

      const accessFields = $$("[data-entity-access-field]");
      const missing = accessFields.filter(field => field.required && !field.value.trim());
      if (missing.length) {
        return {
          valid: false,
          message: "Complete all required ERP login access fields for this Franchisee or Branch entity.",
          fields: missing
        };
      }

      const password = $('[data-entity-access-field="password"]');
      const confirmation = $('[data-entity-access-field="confirm_password"]');
      if (password.value !== confirmation.value) {
        return {
          valid: false,
          message: "Password and Confirm Password must match.",
          fields: [password, confirmation]
        };
      }

      return { valid: true, message: "", fields: [] };
    }

    function createEntityRecord(record) {
      const entityId = generateEntityId(record);
      const finalRecord = { ...record, entity_id: entityId };
      pageConfig["entity-master"].rows.push([
        entityId,
        finalRecord.legal_name,
        finalRecord.entity_type,
        finalRecord.entity_role,
        finalRecord.status
      ]);
      pageConfig["entity-master"].values = [
        String(pageConfig["entity-master"].rows.length),
        String(pageConfig["entity-master"].rows.filter(row => row[3] === "Franchisee").length),
        String(subLocations.length)
      ];
      parentEntities[entityId] = finalRecord.legal_name;

      $$("[data-entity-location-link]:checked").forEach(checkbox => {
        const location = subLocations.find(item => item.id === checkbox.dataset.entityLocationLink);
        if (!location) return;
        location.parentCode = entityId;
        location.parent = finalRecord.legal_name;
        if (location.record) location.record.parent_entity_id = entityId;
      });

      selectedEntityId = entityId;
      resetEntityAccessFields();
      activatePage("entity-master");
      $("#moduleSearch").value = entityId;
      renderModule("entity-master");
      showToast(`${finalRecord.legal_name} created and selected.`);
    }

    const employeeSetupSections = [
      { name: "Employment Basics", section: 0, fields: ["first_name", "last_name", "employee_type", "employment_subtype", "date_of_joining", "status"] },
      { name: "Organization Assignment", section: 1, fields: ["parent_entity_id", "location_id", "department_id", "designation_id"] },
      { name: "Access & Attendance", section: 2, fields: ["phone", "email", "login_id", "role_id"] },
      { name: "Personal Profile", section: 3, fields: ["date_of_birth", "blood_group", "guardian_name"] },
      { name: "Address", section: 4, fields: ["present_address", "address_city", "address_state", "address_pincode"] },
      { name: "Emergency Contact", section: 5, fields: ["emergency_contact_name", "emergency_relationship", "emergency_phone"] },
      { name: "Statutory & KYC", section: 6, fields: ["aadhaar_number", "pan_number"] },
      { name: "Finance", section: 7, fields: ["bank_name", "account_number", "ifsc_code"] },
      { name: "Documents, Skills & Shift", section: 8, fields: ["document_type", "document_status", "primary_skill", "shift_preference_mode", "default_shift_id"] }
    ];

    function setEmployeeFormHeader() {
      setBreadcrumb(["HRMS", "Employees", "Employee Master", "Add New Employee"]);
      $("#pageTitle").textContent = "Add New Employee";
      $("#pageDescription").textContent = "Create one employee profile through a unified setup workflow. Related profile sections are linked internally by the system.";
      $(".page-actions").classList.add("is-form-page");
      $("#exportButton").style.display = "none";
      $("#primaryAction").className = "button";
      $("#primaryAction").innerHTML = `<i data-lucide="arrow-left"></i>Back to Employee Control Center`;
      $("#modalTitle").textContent = "Add New Employee";
      $("#modalSubtitle").textContent = "Employee setup workflow";
    }

    function openEmployeeForm() {
      activePage = "employee-master-form";
      $$(".nav-single, .nav-child").forEach(button => button.classList.remove("is-active"));
      $('.nav-single[data-page="employee-master"]').classList.add("is-active");
      $("#dashboardView").classList.remove("is-active");
      $("#locationControlView").classList.remove("is-active");
      $("#locationFormView").classList.remove("is-active");
      $("#entityFormView").classList.remove("is-active");
      $("#moduleView").classList.remove("is-active");
      $("#employeeFormView").classList.add("is-active");
      setEmployeeFormHeader();
      resetEmployeeForm();
      closeMobileMenu();
      window.scrollTo({ top: 0, behavior: "smooth" });
      refreshIcons();
    }

    function resetEmployeeForm() {
      $("#employeeForm").reset();
      $('[data-employee-field="nationality"]').value = "Indian";
      $('[data-employee-field="same_as_present"]').value = "true";
      $('[data-employee-field="is_reporting_manager_eligible"]').value = "false";
      $('[data-employee-field="is_salesperson"]').value = "false";
      $('[data-employee-field="face_registered"]').value = "false";
      renderEmployeePreferredShiftOptions();
      clearEmployeeFormError();
      setEmployeeStep(0);
      updateEmployeeReadiness();
    }

    function renderEmployeePreferredShiftOptions() {
      const locationId = $('[data-employee-field="location_id"]').value;
      const preferredShift = $("#employeePreferredShift");
      if (!preferredShift) return;
      const currentValue = preferredShift.value;
      const location = subLocations.find(item => item.id === locationId);
      const activeShifts = (location?.shifts || []).filter(shift => shift[5] === "Active");
      if (!locationId) {
        preferredShift.innerHTML = `<option value="">Select assigned location first</option>`;
        preferredShift.disabled = true;
        return;
      }
      if (!activeShifts.length) {
        preferredShift.innerHTML = `<option value="">No active shifts available for this location</option>`;
        preferredShift.disabled = true;
        return;
      }
      preferredShift.disabled = false;
      preferredShift.innerHTML = [
        `<option value="">No preferred shift</option>`,
        ...activeShifts.map(shift => `<option value="${shift[0]}">${shift[1]} - ${shift[2]}</option>`)
      ].join("");
      if (activeShifts.some(shift => shift[0] === currentValue)) {
        preferredShift.value = currentValue;
      }
    }

    function collectEmployeeRecord() {
      return $$("[data-employee-field]").reduce((record, field) => {
        record[field.dataset.employeeField] = field.value.trim();
        return record;
      }, {});
    }

    function generateEmployeeId(record) {
      const code = record.location_id || "EMP";
      const parts = code.split("-");
      const prefix = parts.length >= 2 ? `${parts[0]}-${parts[1].replace(/\d+$/, "")}` : "EMP";
      const existingNumbers = pageConfig["employee-master"].rows
        .map(row => {
          const match = String(row[0]).match(/(?:EMP|CON|E)(\d+)$/);
          return match ? Number(match[1]) : NaN;
        })
        .filter(Number.isFinite);
      const next = Math.max(1526, ...existingNumbers) + 1;
      return `${prefix}-E${next}`;
    }

    function employeeFullName(record) {
      return `${record.first_name || ""} ${record.last_name || ""}`.trim() || "New Employee";
    }

    function employeeLabelFromSelect(fieldName, fallback = "") {
      const field = $(`[data-employee-field="${fieldName}"]`);
      return field?.selectedOptions?.[0]?.textContent?.trim() || fallback;
    }

    function employeeSectionComplete(record, section) {
      return section.fields.every(field => Boolean(record[field]));
    }

    function employeeReadiness(record = collectEmployeeRecord()) {
      const states = employeeSetupSections.map(section => ({ ...section, complete: employeeSectionComplete(record, section) }));
      const completed = states.filter(item => item.complete).length;
      return {
        states,
        completed,
        percent: Math.round((completed / states.length) * 100),
        status: completed === states.length ? "Ready to Activate" : completed >= 2 ? "Continue Setup" : "Incomplete Profile"
      };
    }

    function updateEmployeeReadiness() {
      const readiness = employeeReadiness();
      $("#employeeReadinessPercent").textContent = `${readiness.percent}%`;
      $("#employeeReadinessBar").style.width = `${readiness.percent}%`;
      $("#employeeReadinessStatus").textContent = readiness.status;
      $("#employeeReadinessStatus").className = `badge ${readiness.percent === 100 ? "green" : readiness.percent >= 50 ? "blue" : "amber"}`;
      $("#employeeReadinessList").innerHTML = readiness.states.map(item => `
        <div class="readiness-item ${item.complete ? "is-complete" : ""}">
          <span class="readiness-dot">${item.complete ? "✓" : "!"}</span>
          <span><strong>${item.name}</strong>${item.complete ? "Completed" : "Missing required details"}</span>
        </div>
      `).join("");
      $("#employeeReviewGrid").innerHTML = readiness.states.map(item => `
        <div class="employee-review-card">
          <strong>${item.name}</strong>
          <span>${item.complete ? "Ready" : "Needs attention before activation"}</span>
        </div>
      `).join("");
    }

    function setEmployeeStep(stepIndex) {
      activeEmployeeStep = Math.max(0, Math.min(9, stepIndex));
      $$("#employeeStepper [data-employee-step]").forEach((step, index) => {
        step.classList.toggle("is-active", index === activeEmployeeStep);
        step.classList.toggle("is-complete", index < activeEmployeeStep);
      });
      $$("[data-employee-section]").forEach((section, index) => {
        section.classList.toggle("is-active", index === activeEmployeeStep);
      });
      $("#backEmployeeStep").disabled = activeEmployeeStep === 0;
      $("#nextEmployeeStep").hidden = activeEmployeeStep === 9;
      $("#submitEmployeeForm").hidden = activeEmployeeStep !== 9;
      clearEmployeeFormError();
      updateEmployeeReadiness();
      refreshIcons();
    }

    function clearEmployeeFormError() {
      $("#employeeFormError").classList.remove("is-visible");
      $$("[data-employee-field]").forEach(field => field.removeAttribute("aria-invalid"));
    }

    function showEmployeeFormError(message, fields = []) {
      $("#employeeFormErrorText").textContent = message;
      $("#employeeFormError").classList.add("is-visible");
      fields.forEach(field => field.setAttribute("aria-invalid", "true"));
      $("#employeeFormError").scrollIntoView({ behavior: "smooth", block: "center" });
      refreshIcons();
    }

    function validateEmployeeForm(record, requireMinimum = true) {
      const requiredFields = $$("[data-employee-field][required]");
      const missing = requiredFields.filter(field => !record[field.dataset.employeeField]);
      if (missing.length) {
        return { valid: false, message: "Complete the required employee fields before creating the employee.", fields: missing };
      }
      const emailField = $('[data-employee-field="email"]');
      if (record.email && !emailField.validity.valid) {
        return { valid: false, message: "Enter a valid email address.", fields: [emailField] };
      }
      if (requireMinimum && employeeReadiness(record).completed < 2) {
        return { valid: false, message: "Complete at least Employment Basics and Organization Assignment before creating the employee.", fields: [] };
      }
      return { valid: true, message: "", fields: [] };
    }

    function createEmployeeRecord(record, asDraft = false) {
      const employeeId = generateEmployeeId(record);
      const readiness = employeeReadiness(record);
      const profileStatus = readiness.percent === 100 ? "Complete" : readiness.percent >= 50 ? "Continue Setup" : "Incomplete Profile";
      const employeeStatus = asDraft ? "Draft" : record.status || "Active";
      pageConfig["employee-master"].rows.push([
        employeeId,
        employeeFullName(record),
        record.location_id ? employeeLabelFromSelect("location_id", record.location_id).replace(/^.*? - /, "") : "Not assigned",
        record.designation_id ? employeeLabelFromSelect("designation_id", record.designation_id).replace(/^.*? - /, "") : "Not assigned",
        profileStatus,
        employeeStatus
      ]);
      pageConfig["employee-master"].values = [
        String(pageConfig["employee-master"].rows.length),
        String(pageConfig["employee-master"].rows.filter(row => row[4] === "Complete").length),
        String(pageConfig["employee-master"].rows.filter(row => row[4] !== "Complete").length)
      ];
      selectedEmployeeId = employeeId;
      activatePage("employee-master");
      $("#moduleSearch").value = employeeId;
      renderModule("employee-master");
      showToast(`${employeeFullName(record)} ${asDraft ? "saved as draft" : "created"} and selected.`);
    }

    function openGroup(groupElement, forceOpen = null) {
      const parent = $(".nav-parent", groupElement);
      const children = $(".nav-children", groupElement);
      const shouldOpen = forceOpen === null ? !parent.classList.contains("is-open") : forceOpen;
      if (shouldOpen) {
        $$(".nav-group").forEach(otherGroup => {
          if (otherGroup === groupElement) return;
          $(".nav-parent", otherGroup).classList.remove("is-open");
          $(".nav-children", otherGroup).classList.remove("is-open");
        });
      }
      parent.classList.toggle("is-open", shouldOpen);
      children.classList.toggle("is-open", shouldOpen);
    }

    function activatePage(pageKey) {
      hoursEditMode = false;
      hoursDraft = null;
      activePage = pageKey;
      $$(".nav-single, .nav-child").forEach(button => button.classList.remove("is-active"));
      $("#dashboardView").classList.remove("is-active");
      $("#locationControlView").classList.remove("is-active");
      $("#locationFormView").classList.remove("is-active");
      $("#entityFormView").classList.remove("is-active");
      $("#employeeFormView").classList.remove("is-active");
      $("#moduleView").classList.remove("is-active");
      if (pageKey === "dashboard") {
        $$(".nav-parent").forEach(parent => parent.classList.remove("is-open"));
        $$(".nav-children").forEach(children => children.classList.remove("is-open"));
        $('[data-page="dashboard"]').classList.add("is-active");
        $("#dashboardView").classList.add("is-active");
        setPageHeader("Dashboard", "Operations Dashboard", "Monitor today's workforce, roster coverage, leave decisions and attendance exceptions across Indipet locations.", "Add Employee", "user-plus");
      } else if (pageKey === "sub-location") {
        const target = $('.nav-child[data-page="sub-location"]');
        target.classList.add("is-active");
        openGroup(target.closest(".nav-group"), true);
        $("#locationControlView").classList.add("is-active");
        setPageHeader(
          "Organization",
          "Sub Location Control Center",
          "Manage locations, operating hours, services, delivery zones, onboarding and shift policies from one workspace.",
          "Add New Location",
          "plus"
        );
        $("#exportButton").innerHTML = `<i data-lucide="clipboard-check"></i>Run Readiness Check`;
        renderLocationControl();
      } else {
        const target = $(`.nav-single[data-page="${pageKey}"], .nav-child[data-page="${pageKey}"], .support-button[data-page="${pageKey}"]`);
        if (target) {
          target.classList.add("is-active");
          const group = target.closest(".nav-group");
          if (group) openGroup(group, true);
        }
        const config = pageConfig[pageKey];
        if (!config) return;
        $("#moduleView").classList.add("is-active");
        setPageHeader(config.parent, config.title, config.description, config.action, config.icon);
        if (!$("#moduleSearch") || !$("#moduleLocation") || !$("#moduleStatus")) {
          restoreGenericModuleFilters();
        }
        $("#moduleSearch").value = "";
        $("#moduleLocation").value = "all";
        $("#moduleStatus").value = "all";
        renderModule(pageKey);
      }
      closeMobileMenu();
      window.scrollTo({ top: 0, behavior: "smooth" });
      refreshIcons();
    }

    function setBreadcrumb(parts) {
      $("#breadcrumb").innerHTML = parts.map((part, index) => `
        ${index ? `<i data-lucide="chevron-right"></i>` : ""}
        <span ${index === parts.length - 1 ? `id="breadcrumbCurrent"` : ""}>${part}</span>
      `).join("");
    }

    function setPageHeader(parent, title, description, action, icon) {
      setBreadcrumb(parent === "Dashboard" ? ["HRMS", "Dashboard"] : ["HRMS", parent, title]);
      $("#pageTitle").textContent = title;
      $("#pageDescription").textContent = description;
      $(".page-actions").classList.remove("is-form-page");
      $("#exportButton").style.display = "";
      $("#exportButton").innerHTML = `<i data-lucide="download"></i>Export`;
      $("#primaryAction").className = "button primary";
      $("#primaryAction").innerHTML = `<i data-lucide="${icon}"></i>${action}`;
      $("#modalTitle").textContent = action;
      $("#modalSubtitle").textContent = `${action} in ${title}`;
    }

    function showToast(message) {
      $("#toastText").textContent = message;
      $("#toast").classList.add("is-visible");
      clearTimeout(showToast.timer);
      showToast.timer = setTimeout(() => $("#toast").classList.remove("is-visible"), 2600);
    }

    function openModal() {
      $("#recordModal").classList.add("is-open");
      setTimeout(() => $("#recordName").focus(), 50);
    }

    function closeModal() {
      $("#recordModal").classList.remove("is-open");
    }

    function openDrawer() {
      $("#notificationDrawer").classList.add("is-open");
      $("#drawerBackdrop").classList.add("is-open");
      $("#notificationDrawer").setAttribute("aria-hidden", "false");
    }

    function closeDrawer() {
      $("#notificationDrawer").classList.remove("is-open");
      $("#drawerBackdrop").classList.remove("is-open");
      $("#notificationDrawer").setAttribute("aria-hidden", "true");
    }

    function openMobileMenu() {
      $("#sidebar").classList.add("is-mobile-open");
      $("#mobileBackdrop").classList.add("is-open");
    }

    function closeMobileMenu() {
      $("#sidebar").classList.remove("is-mobile-open");
      $("#mobileBackdrop").classList.remove("is-open");
    }

    $$(".nav-parent").forEach(parent => {
      parent.addEventListener("click", () => openGroup(parent.closest(".nav-group")));
    });

    $$("[data-page]").forEach(button => {
      button.addEventListener("click", () => activatePage(button.dataset.page));
    });

    $$("[data-nav-target]").forEach(button => {
      button.addEventListener("click", () => activatePage(button.dataset.navTarget));
    });

    $("#collapseSidebar").addEventListener("click", () => {
      document.body.classList.toggle("sidebar-collapsed");
      $("#collapseSidebar").innerHTML = `<i data-lucide="${document.body.classList.contains("sidebar-collapsed") ? "panel-left-open" : "panel-left-close"}"></i>`;
      refreshIcons();
    });

    $("#mobileMenu").addEventListener("click", openMobileMenu);
    $("#mobileBackdrop").addEventListener("click", closeMobileMenu);
    $("#notificationButton").addEventListener("click", openDrawer);
    $("#closeDrawer").addEventListener("click", closeDrawer);
    $("#drawerBackdrop").addEventListener("click", closeDrawer);
    $("#primaryAction").addEventListener("click", () => {
      if (activePage === "entity-master") {
        openEntityForm();
        return;
      }
      if (activePage === "entity-master-form") {
        activatePage("entity-master");
        return;
      }
      if (activePage === "employee-master") {
        openEmployeeForm();
        return;
      }
      if (activePage === "employee-master-form") {
        activatePage("employee-master");
        return;
      }
      if (activePage === "sub-location") {
        openLocationForm("create");
        return;
      }
      if (activePage === "sub-location-form") {
        activatePage("sub-location");
        return;
      }
      if (activePage === "roster") {
        openRosterGenerateModal();
        return;
      }
      if (activePage === "roster-board") {
        activatePage("roster");
        return;
      }
      openModal();
    });
    $("#quickAdd").addEventListener("click", openModal);
    $$(".close-modal").forEach(button => button.addEventListener("click", closeModal));
    $("#recordModal").addEventListener("click", event => {
      if (event.target === $("#recordModal")) closeModal();
    });

    $("#recordForm").addEventListener("submit", event => {
      event.preventDefault();
      const name = $("#recordName").value.trim();
      closeModal();
      event.target.reset();
      showToast(`${name || "Record"} created as a draft.`);
    });

    $("#closeShiftPolicyModal").addEventListener("click", closeShiftPolicyModal);
    $("#cancelShiftPolicy").addEventListener("click", closeShiftPolicyModal);
    $("#shiftPolicyModal").addEventListener("click", event => {
      if (event.target === $("#shiftPolicyModal")) closeShiftPolicyModal();
    });
    $("#shiftPolicyModal").addEventListener("change", event => {
      const timePart = event.target.closest("[data-shift-time-field]");
      if (!timePart) return;
      syncShiftTimeField(timePart.dataset.shiftTimeField);
      $("#shiftStartTime").removeAttribute("aria-invalid");
      $("#shiftEndTime").removeAttribute("aria-invalid");
      $("#shiftPolicyError").classList.remove("is-visible");
      updateShiftPolicyCalculations();
    });
    ["shiftPolicyName", "shiftPolicyStatus", "shiftCoverageRole", "shiftStartTime", "shiftEndTime", "shiftBreakMinutes", "shiftRequiredStaff", "shiftDailyLeaveLimit", "shiftWeeklyOffPattern", "shiftWeeklyOffDay", "shiftMaxConsecutiveDays", "shiftPrimaryKeyholder", "shiftBackupKeyholder"].forEach(id => {
      $(`#${id}`).addEventListener("input", () => {
        $(`#${id}`).removeAttribute("aria-invalid");
        $("#shiftPolicyError").classList.remove("is-visible");
        updateShiftPolicyCalculations();
      });
      $(`#${id}`).addEventListener("change", () => {
        $(`#${id}`).removeAttribute("aria-invalid");
        $("#shiftPolicyError").classList.remove("is-visible");
        updateShiftPolicyCalculations();
        if (id === "shiftCoverageRole") updateShiftCoverageRoleControls();
        if (id === "shiftWeeklyOffPattern") updateShiftWeeklyOffControls();
        if (id === "shiftPrimaryKeyholder") updateShiftKeyholderControls();
      });
    });
    $$("[data-keyholder-required]").forEach(button => {
      button.addEventListener("click", () => {
        shiftPolicyKeyholderRequired = button.dataset.keyholderRequired === "true";
        updateShiftKeyholderControls();
        $("#shiftPolicyError").classList.remove("is-visible");
      });
    });
    $("#shiftPolicyForm").addEventListener("submit", event => {
      event.preventDefault();
      clearShiftPolicyError();
      updateShiftPolicyCalculations();
      updateShiftWeeklyOffControls();
      updateShiftKeyholderControls();
      const record = collectShiftPolicyFormRecord();
      const validation = validateShiftPolicyRecord(record);
      if (!validation.valid) {
        showShiftPolicyError(validation.message, validation.fields);
        return;
      }
      createShiftPolicy(record);
    });

    $("#closeRosterGenerateModal").addEventListener("click", closeRosterGenerateModal);
    $("#cancelRosterGenerate").addEventListener("click", closeRosterGenerateModal);
    $("#closeRosterReview").addEventListener("click", closeRosterGenerateModal);
    $("#rosterGenerateModal").addEventListener("click", event => {
      if (event.target === $("#rosterGenerateModal")) closeRosterGenerateModal();
    });
    $("#rosterStartDate").addEventListener("change", () => {
      if ($("#rosterStartDate").value) {
        $("#rosterWeekHelp").textContent = `Roster period starts ${formatShortDate($("#rosterStartDate").value)}.`;
      }
    });
    $("#backRosterGenerate").addEventListener("click", () => setRosterGenerateStep(1));
    $("#rosterGenerateForm").addEventListener("submit", event => {
      event.preventDefault();
      const setup = collectRosterGenerateSetup();
      const validationMessage = validateRosterGenerateSetup(setup);
      if (validationMessage) {
        showToast(validationMessage);
        return;
      }
      rosterGeneratedSetup = setup;
      rosterGeneratedResult = generateRosterPreview(setup);
      renderRosterReview(rosterGeneratedResult);
      setRosterGenerateStep(2);
    });
    $("#confirmRosterDraft").addEventListener("click", () => {
      if (!rosterGeneratedResult) return;
      closeRosterGenerateModal();
      showToast(`${rosterGeneratedResult.location.listName} roster draft saved for ${rosterGeneratedResult.period}.`);
    });
    $("#publishRoster").addEventListener("click", () => {
      if (!rosterGeneratedResult) return;
      closeRosterGenerateModal();
      showToast(`${rosterGeneratedResult.location.listName} roster published for ${rosterGeneratedResult.period}.`);
    });

    $("#exportButton").addEventListener("click", () => {
      if (activePage === "sub-location") {
        showToast(`${getSelectedLocation().listName} readiness check completed.`);
        return;
      }
      showToast(`${$("#pageTitle").textContent} export prepared.`);
    });
    $("#columnButton").addEventListener("click", () => showToast("Column preferences opened for this table."));
    $("#profileButton").addEventListener("click", () => showToast("Signed in as HR & Operations Admin."));

    $("#chartLocation").addEventListener("change", event => {
      const multipliers = { "All Locations": 1, "Corporate HQ": 0.42, "Lake Gardens": 0.56, "Newtown": 0.37, "Rajarhat": 0.31 };
      renderWeeklyChart(multipliers[event.target.value] || 1);
    });

    const attendanceCard = $("#dashboardView .table-card");
    $(".record-search", attendanceCard).addEventListener("input", () => {
      attendancePage = 1;
      renderAttendance();
    });
    $(".location-filter", attendanceCard).addEventListener("change", () => {
      attendancePage = 1;
      renderAttendance();
    });
    $(".status-filter", attendanceCard).addEventListener("change", () => {
      attendancePage = 1;
      renderAttendance();
    });
    $(".reset-filters", attendanceCard).addEventListener("click", () => {
      $(".record-search", attendanceCard).value = "";
      $(".location-filter", attendanceCard).value = "all";
      $(".status-filter", attendanceCard).value = "all";
      attendancePage = 1;
      renderAttendance();
    });
    $(".page-prev", attendanceCard).addEventListener("click", () => {
      attendancePage = Math.max(1, attendancePage - 1);
      renderAttendance();
    });
    $(".page-next", attendanceCard).addEventListener("click", () => {
      attendancePage += 1;
      renderAttendance();
    });
    $(".page-buttons", attendanceCard).addEventListener("click", event => {
      const button = event.target.closest(".page-button:not(.page-prev):not(.page-next)");
      if (!button) return;
      attendancePage = Number(button.textContent);
      renderAttendance();
    });
    $(".select-all", attendanceCard).addEventListener("change", event => {
      $$(".row-checkbox", attendanceCard).forEach(box => box.checked = event.target.checked);
      updateBulkBar(attendanceCard);
    });
    $(".records-body", attendanceCard).addEventListener("change", event => {
      if (event.target.matches(".row-checkbox")) updateBulkBar(attendanceCard);
    });
    $(".records-body", attendanceCard).addEventListener("click", event => {
      const menuButton = event.target.closest(".row-menu-button");
      if (menuButton) {
        const menu = $(".row-menu", menuButton.parentElement);
        $$(".row-menu").forEach(item => {
          if (item !== menu) item.classList.remove("is-open");
        });
        menu.classList.toggle("is-open");
        return;
      }
      const action = event.target.closest("[data-row-action]");
      if (action) {
        const row = action.closest("tr");
        $(".row-menu", row).classList.remove("is-open");
        showToast(`${action.textContent.trim()} opened for ${row.dataset.recordId}.`);
      }
    });

    ["moduleSearch", "moduleLocation", "moduleStatus"].forEach(id => {
      const eventName = id === "moduleSearch" ? "input" : "change";
      $(`#${id}`).addEventListener(eventName, () => renderModule(activePage));
    });
    $("#moduleReset").addEventListener("click", () => {
      $("#moduleSearch").value = "";
      $("#moduleLocation").value = "all";
      $("#moduleStatus").value = "all";
      renderModule(activePage);
    });
    $("#moduleView").addEventListener("click", event => {
      const rosterPrimary = event.target.closest(".roster-row-primary");
      if (rosterPrimary) {
        const action = rosterPrimary.dataset.rosterPrimary;
        selectedLocationId = rosterPrimary.dataset.locationId;
        if (action === "view") {
          openRosterBoard(rosterPrimary.dataset.rosterId, rosterPrimary.dataset.locationId);
          return;
        }
        if (action === "generate") {
          openRosterGenerateModal({ lockedLocation: true });
          return;
        }
        if (action === "publish") {
          showToast("Roster is ready for publish review.");
          return;
        }
        return;
      }
      if (event.target.closest("[data-roster-more]")) {
        showToast("Roster history, export and cancel draft actions are ready for workflow integration.");
        return;
      }
      const rosterBoardTab = event.target.closest("[data-roster-board-tab]");
      if (rosterBoardTab) {
        setRosterBoardTab(rosterBoardTab.dataset.rosterBoardTab);
        return;
      }
      const boardAction = event.target.closest("[data-roster-board-action]");
      if (boardAction) {
        const locationId = boardAction.dataset.locationId;
        const location = subLocations.find(item => item.id === locationId) || getSelectedLocation();
        selectedLocationId = location.id;
        const action = boardAction.dataset.rosterBoardAction;
        if (action === "validate") {
          showToast(`${location.listName} roster validation refreshed.`);
          return;
        }
        if (action === "generate") {
          openRosterGenerateModal({ lockedLocation: true });
          return;
        }
        if (action === "shift-policy") {
          activeLocationTab = "shift-policy";
          activatePage("sub-location");
          showToast(`Open Location Shift Policy for ${location.listName}.`);
          return;
        }
        if (action === "revision") {
          showToast(`Revision draft opened for ${location.listName}.`);
          return;
        }
        if (action === "edit") {
          showToast(`Roster draft editing enabled for ${location.listName}.`);
          return;
        }
        if (action === "open-slot") {
          showToast(`Open-slot assignment panel opened for ${location.listName}.`);
          return;
        }
        if (action === "publish") {
          showToast(`${location.listName} roster is ready for publish workflow.`);
          return;
        }
        if (action === "export") {
          showToast(`${location.listName} roster export prepared.`);
          return;
        }
        if (action === "history") {
          showToast(`${location.listName} roster history opened.`);
          return;
        }
      }
      const rosterCell = event.target.closest("[data-roster-cell]");
      if (rosterCell && activePage === "roster-board") {
        const employeeName = rosterCell.dataset.employeeName || "Roster slot";
        const rosterDate = rosterCell.dataset.rosterDate || "selected date";
        const shiftName = rosterCell.dataset.shiftName || rosterCell.querySelector("strong")?.textContent?.trim() || "Roster entry";
        showToast(`Edit ${shiftName} for ${employeeName} on ${rosterDate}.`);
        return;
      }
      if (event.target.closest(".module-row-action")) showToast("Record action menu is ready for workflow integration.");
    });

    $("#locationSearch").addEventListener("input", renderLocationList);
    $("#locationFilterButton").addEventListener("click", () => showToast("Location filters opened."));
    $("#locationList").addEventListener("click", event => {
      const item = event.target.closest("[data-location-id]");
      if (!item) return;
      if (hoursEditMode && item.dataset.locationId !== selectedLocationId) {
        showToast("Save or cancel the operating-hour changes before switching locations.");
        return;
      }
      selectedLocationId = item.dataset.locationId;
      renderLocationControl();
    });
    $("#locationTabs").addEventListener("click", event => {
      const tab = event.target.closest("[data-location-tab]");
      if (!tab) return;
      if (hoursEditMode && tab.dataset.locationTab !== "hours") {
        showToast("Save or cancel the operating-hour changes before changing tabs.");
        return;
      }
      activeLocationTab = tab.dataset.locationTab;
      renderLocationTab();
    });
    $("#editLocationButton").addEventListener("click", () => openLocationForm("edit"));
    $("#locationMoreButton").addEventListener("click", () => showToast(`More location actions opened for ${getSelectedLocation().listName}.`));
    $("#locationTabContent").addEventListener("click", event => {
      const hoursSwitch = event.target.closest(".hours-switch");
      if (hoursSwitch) {
        if (!hoursEditMode || !hoursDraft) return;
        const row = hoursDraft.find(item => item.dayOfWeek === Number(hoursSwitch.dataset.dayOfWeek));
        if (!row) return;
        row.isOpen = !row.isOpen;
        renderLocationTab();
        return;
      }

      const action = event.target.closest("[data-control-action]");
      if (!action) return;
      if (action.dataset.controlAction === "edit-hours") {
        startHoursEdit();
        return;
      }
      if (action.dataset.controlAction === "cancel-hours") {
        cancelHoursEdit();
        return;
      }
      if (action.dataset.controlAction === "save-hours") {
        saveHoursEdit();
        return;
      }
      if (action.dataset.controlAction === "add-shift-policy") {
        openShiftPolicyModal();
        return;
      }
      if (action.dataset.controlAction === "open-area") {
        const area = action.closest("tr").cells[0].textContent.trim();
        const areaTabs = {
          "Operating Hours": "hours",
          "Service Config": "services",
          "Delivery Zone": "delivery",
          "Onboarding Checklist": "onboarding",
          "Shift Policy": "shift-policy"
        };
        if (areaTabs[area]) {
          activeLocationTab = areaTabs[area];
          renderLocationTab();
          return;
        }
      }

      const labels = {
        readiness: "Readiness check completed.",
        "copy-hours": "Copy operating hours opened.",
        "row-menu": "Record actions opened.",
        "view-validation": "Validation details opened.",
        "add-service": "Add service configuration opened.",
        "add-zone": "Add delivery zone opened.",
        "refresh-checklist": "Onboarding status refreshed.",
        "export-audit": "Location audit export prepared."
      };
      showToast(labels[action.dataset.controlAction] || "Location action opened.");
    });

    $("#locationTabContent").addEventListener("change", event => {
      const timeInput = event.target.closest("[data-hours-field]");
      if (!timeInput || !hoursEditMode || !hoursDraft) return;
      const row = hoursDraft.find(item => item.dayOfWeek === Number(timeInput.dataset.dayOfWeek));
      if (!row) return;
      row[timeInput.dataset.hoursField] = readSplitTimeValue(
        $("#locationTabContent"),
        "data-hours-field",
        "data-hours-time-part",
        timeInput.dataset.hoursField,
        timeInput.dataset.dayOfWeek
      );
      renderLocationTab();
    });

    $("#locationStepper").addEventListener("click", event => {
      const step = event.target.closest("[data-location-step]");
      if (!step) return;
      setLocationStep(Number(step.dataset.locationStep));
    });

    $$("[data-location-field]").forEach(field => {
      field.addEventListener("input", () => {
        field.removeAttribute("aria-invalid");
        const hasInvalid = $$('[data-location-field][aria-invalid="true"]').length > 0;
        if (!hasInvalid) $("#locationFormError").classList.remove("is-visible");
      });
      field.addEventListener("change", () => field.removeAttribute("aria-invalid"));
    });

    $("#cancelLocationForm").addEventListener("click", () => activatePage("sub-location"));
    $("#backLocationStep").addEventListener("click", () => setLocationStep(activeLocationStep - 1));
    $("#nextLocationStep").addEventListener("click", () => setLocationStep(activeLocationStep + 1));

    $("#locationForm").addEventListener("submit", event => {
      event.preventDefault();
      clearLocationFormError();
      const record = collectLocationFormRecord();
      const validation = validateLocationRecord(record);
      if (!validation.valid) {
        const firstInvalid = validation.fields[0]?.closest("[data-location-section]");
        if (firstInvalid) setLocationStep(Number(firstInvalid.dataset.locationSection));
        showLocationFormError(validation.message, validation.fields);
        return;
      }

      try {
        if (locationFormMode === "edit") {
          const location = subLocations.find(item => item.id === editingLocationId);
          if (!location) {
            showLocationFormError("The selected location could not be found. Return to the control center and try again.");
            return;
          }
          applyLocationRecord(location, record);
          selectedLocationId = record.location_id;
        } else {
          const location = buildLocationFromRecord(record);
          subLocations.push(location);
          selectedLocationId = location.id;
        }

        activeLocationTab = "overview";
        $("#locationSearch").value = "";
        activatePage("sub-location");
        showToast(locationFormMode === "edit"
          ? `${record.location_name} updated successfully.`
          : `${record.location_name} created and selected.`);
      } catch (error) {
        showLocationFormError("The location could not be saved. Review the entered values and try again.");
      }
    });

    $("#cancelEntityForm").addEventListener("click", () => activatePage("entity-master"));
    $("#backEntityStep").addEventListener("click", () => setEntityStep(activeEntityStep - 1));
    $("#nextEntityStep").addEventListener("click", () => setEntityStep(activeEntityStep + 1));
    $("#entityStepper").addEventListener("click", event => {
      const step = event.target.closest("[data-entity-step]");
      if (!step) return;
      setEntityStep(Number(step.dataset.entityStep));
    });
    $$("[data-entity-field], [data-entity-access-field]").forEach(field => {
      field.addEventListener("input", () => {
        field.removeAttribute("aria-invalid");
        $("#entityFormError").classList.remove("is-visible");
      });
      field.addEventListener("change", () => {
        field.removeAttribute("aria-invalid");
        if (field.dataset.entityField === "entity_role") updateEntityAccessState();
      });
    });
    $("#entityForm").addEventListener("submit", event => {
      event.preventDefault();
      clearEntityFormError();
      const record = collectEntityFormRecord();
      const validation = validateEntityRecord(record);
      if (!validation.valid) {
        const firstInvalid = validation.fields[0]?.closest(".entity-form-section");
        if (firstInvalid) setEntityStep(Number(firstInvalid.dataset.entitySection));
        showEntityFormError(validation.message, validation.fields);
        return;
      }
      const accessValidation = validateEntityAccess();
      if (!accessValidation.valid) {
        const firstInvalid = accessValidation.fields[0]?.closest(".entity-form-section");
        if (firstInvalid) setEntityStep(Number(firstInvalid.dataset.entitySection));
        showEntityFormError(accessValidation.message, accessValidation.fields);
        return;
      }
      try {
        createEntityRecord(record);
      } catch (error) {
        showEntityFormError("The entity could not be created. Review the entered values and try again.");
      }
    });

    $("#cancelEmployeeForm").addEventListener("click", () => activatePage("employee-master"));
    $("#backEmployeeStep").addEventListener("click", () => setEmployeeStep(activeEmployeeStep - 1));
    $("#nextEmployeeStep").addEventListener("click", () => setEmployeeStep(activeEmployeeStep + 1));
    $("#employeeStepper").addEventListener("click", event => {
      const step = event.target.closest("[data-employee-step]");
      if (!step) return;
      setEmployeeStep(Number(step.dataset.employeeStep));
    });
    $$("[data-employee-field]").forEach(field => {
      field.addEventListener("input", () => {
        field.removeAttribute("aria-invalid");
        $("#employeeFormError").classList.remove("is-visible");
        updateEmployeeReadiness();
      });
      field.addEventListener("change", () => {
        field.removeAttribute("aria-invalid");
        $("#employeeFormError").classList.remove("is-visible");
        if (field.dataset.employeeField === "location_id") renderEmployeePreferredShiftOptions();
        updateEmployeeReadiness();
      });
    });
    $("#saveEmployeeDraft").addEventListener("click", () => {
      clearEmployeeFormError();
      const record = collectEmployeeRecord();
      if (!record.first_name && !record.last_name) {
        showEmployeeFormError("Enter at least the employee name before saving a draft.", [
          $('[data-employee-field="first_name"]'),
          $('[data-employee-field="last_name"]')
        ]);
        return;
      }
      createEmployeeRecord({ ...record, status: "Draft" }, true);
    });
    $("#employeeForm").addEventListener("submit", event => {
      event.preventDefault();
      clearEmployeeFormError();
      const record = collectEmployeeRecord();
      const validation = validateEmployeeForm(record);
      if (!validation.valid) {
        const firstInvalid = validation.fields[0]?.closest("[data-employee-section]");
        if (firstInvalid) setEmployeeStep(Number(firstInvalid.dataset.employeeSection));
        showEmployeeFormError(validation.message, validation.fields);
        return;
      }
      try {
        createEmployeeRecord(record);
      } catch (error) {
        showEmployeeFormError("The employee could not be created. Review the entered values and try again.");
      }
    });

    $("#globalSearch").addEventListener("keydown", event => {
      if (event.key === "Enter") {
        const value = event.target.value.trim();
        if (value) showToast(`Searching HRMS for "${value}".`);
      }
    });

    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        $("#globalSearch").focus();
      }
      if (event.key === "Escape") {
        closeModal();
        closeDrawer();
        closeMobileMenu();
        $$(".row-menu").forEach(menu => menu.classList.remove("is-open"));
      }
    });

    document.addEventListener("click", event => {
      if (!event.target.closest(".row-menu-wrap")) {
        $$(".row-menu").forEach(menu => menu.classList.remove("is-open"));
      }
    });

    renderWeeklyChart();
    renderAttendance();
    renderLocationControl();
    refreshIcons();
