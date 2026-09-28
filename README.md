# Ahl Elsan3a

{

  "project": {

    "name": "Ahl Elsan3a",

    "type": "Local Services Directory MVP",

    "language": "Arabic",

    "target_market": "Egyptian villages",

    "goal": "Create a simple digital directory for local craftsmen, workers and service providers whose contact information is usually scattered or difficult to find."

  },

  "mvp_scope": {

    "phase": "Phase 1",

    "focus": "Admin-managed directory",

    "important": [

      "Do not build complex booking or payment systems yet.",

      "Do not require GPS or maps in MVP.",

      "Admin manually enters and manages service providers.",

      "Architecture must remain scalable for future self-registration, reviews, subscriptions and booking."

    ]

  },

  "user_types": {

    "customer": {

      "description": "Regular visitor looking for a local service.",

      "features": [

        "Browse service categories",

        "Search by name or service",

        "Filter by village/area",

        "View provider profile",

        "Call provider",

        "Open WhatsApp when available",

        "Report incorrect information"

      ]

    },

    "admin": {

      "description": "Platform owner who manages all directory data.",

      "features": [

        "Secure admin login",

        "Dashboard statistics",

        "Add provider",

        "Edit provider",

        "Hide provider",

        "Delete provider",

        "Manage categories",

        "Manage villages/areas",

        "Mark provider as premium",

        "Manage premium expiration",

        "Search and filter providers"

      ]

    }

  },

  "provider_data": {

    "required": [

      "name",

      "category",

      "village_or_area",

      "phone"

    ],

    "optional": [

      "whatsapp",

      "description",

      "service_details",

      "price_description",

      "working_hours",

      "secondary_phone",

      "photo"

    ],

    "system_fields": [

      "id",

      "status",

      "is_premium",

      "premium_expires_at",

      "created_at",

      "updated_at"

    ]

  },

  "categories": [

    "كهربائي",

    "سباك",

    "نجار",

    "نقاش",

    "حداد",

    "فني تكييف",

    "فني أجهزة كهربائية",

    "ميكانيكي",

    "سمكري سيارات",

    "عامل بناء",

    "عامل سيراميك",

    "عامل ألوميتال",

    "عامل رخام",

    "مبيض محارة",

    "فني دش وريسيفر",

    "خياط",

    "حلاق",

    "مصور",

    "دروس خصوصية",

    "نقل ومواصلات",

    "خدمات منزلية",

    "أخرى"

  ],

  "customer_ui": {

    "home": {

      "elements": [

        "App logo/name",

        "Search bar",

        "Choose village/area",

        "Popular categories",

        "All categories",

        "Featured providers",

        "Simple call-to-action: ابحث عن صنايعي"

      ]

    },

    "category_page": {

      "elements": [

        "Category title",

        "Search within category",

        "Area filter",

        "Provider cards"

      ]

    },

    "provider_card": {

      "show": [

        "Provider name",

        "Category",

        "Area",

        "Short description",

        "Premium badge when applicable",

        "Call button",

        "WhatsApp button when available"

      ]

    },

    "provider_profile": {

      "show": [

        "Name",

        "Category",

        "Area",

        "Description",

        "Services",

        "Price information if provided",

        "Working hours if provided",

        "Phone/contact buttons",

        "Premium badge when applicable",

        "Report incorrect information button"

      ]

    }

  },

  "premium_system": {

    "purpose": "Allow selected providers to receive better visibility through a future paid subscription.",

    "mvp": [

      "Admin can manually mark provider as premium.",

      "Admin can set premium expiration date.",

      "Premium providers receive a visible badge.",

      "Premium providers can appear in a featured section."

    ],

    "future": [

      "Online subscriptions",

      "Payment gateway",

      "Automatic renewal",

      "Subscription plans",

      "Provider self-service dashboard"

    ]

  },

  "admin_dashboard": {

    "dashboard": [

      "Total providers",

      "Active providers",

      "Hidden providers",

      "Premium providers",

      "Categories count",

      "Areas count"

    ],

    "provider_management": [

      "Create",

      "Read",

      "Update",

      "Hide/Unhide",

      "Delete",

      "Search",

      "Filter by category",

      "Filter by area",

      "Filter by status",

      "Filter by premium"

    ],

    "category_management": [

      "Add category",

      "Edit category",

      "Hide category"

    ],

    "area_management": [

      "Add village/area",

      "Edit village/area",

      "Hide area"

    ]

  },

  "database": {

    "tables": [

      {

        "name": "providers",

        "fields": [

          "id",

          "name",

          "category_id",

          "area_id",

          "phone",

          "whatsapp",

          "description",

          "services",

          "price_description",

          "working_hours",

          "photo_url",

          "status",

          "is_premium",

          "premium_expires_at",

          "created_at",

          "updated_at"

        ]

      },

      {

        "name": "categories",

        "fields": [

          "id",

          "name",

          "icon",

          "status",

          "created_at"

        ]

      },

      {

        "name": "areas",

        "fields": [

          "id",

          "name",

          "status",

          "created_at"

        ]

      },

      {

        "name": "reports",

        "fields": [

          "id",

          "provider_id",

          "reason",

          "details",

          "status",

          "created_at"

        ]

      },

      {

        "name": "admins",

        "fields": [

          "id",

          "email",

          "role",

          "created_at"

        ]

      }

    ]

  },

  "design": {

    "style": "Modern, clean, trustworthy and extremely simple.",

    "mobile_first": true,

    "target_users": "Egyptian village residents",

    "requirements": [

      "Large readable Arabic text",

      "Simple navigation",

      "Large buttons",

      "Fast loading",

      "Clear phone and WhatsApp actions",

      "Avoid unnecessary animations",

      "Responsive on mobile, tablet and desktop"

    ]

  },

  "security": {

    "requirements": [

      "Admin area must require authentication.",

      "Customers must never access admin functions.",

      "Provider management must be restricted to admins.",

      "Do not expose database credentials in frontend.",

      "Use secure environment variables.",

      "Use proper database access rules."

    ]

  },

  "future_ready": {

    "phase_2": [

      "Provider self-registration",

      "Provider login",

      "Provider profile editing",

      "Verified provider badge",

      "Customer accounts",

      "Ratings and reviews",

      "Service requests"

    ],

    "phase_3": [

      "Booking",

      "In-app messaging",

      "Location/GPS",

      "Maps",

      "Notifications",

      "Online payments",

      "Premium subscriptions"

    ]

  },

  "technical_requirements": {

    "platform": "Lovable",

    "backend": "Use Lovable's recommended backend/database stack.",

    "architecture": "Modular and scalable.",

    "important": [

      "Build the smallest functional MVP first.",

      "Avoid unnecessary dependencies.",

      "Reuse components.",

      "Keep database relationships clean.",

      "Make categories and areas dynamic instead of hardcoded.",

      "Use reusable ProviderCard and ProviderProfile components."

    ]

  },

  "success_criteria": [

    "Admin can add a provider in under one minute.",

    "Customer can find a needed service in a few taps.",

    "Customer can call or WhatsApp the provider directly.",

    "Admin can instantly hide incorrect or outdated numbers.",

    "Premium providers can be promoted without changing the database structure.",

    "The system can later support provider accounts, reviews, booking and payments without rebuilding the core."

  ],

  "build_instruction": "Build only the MVP described above. Prioritize functionality, speed, simplicity and clean architecture over visual complexity. Generate the database schema, authentication, customer interface and admin dashboard. Use Arabic RTL throughout the application."

}

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
