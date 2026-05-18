# 🔥 Firestore Database Structure

> Generated on: 18/5/2026, 3:59:54 pm

---

## Table of Contents

- [`activities`](#-activities)
- [`adminPermissions`](#-adminpermissions)
- [`admins`](#-admins)
- [`agentPermissions`](#-agentpermissions)
- [`agents`](#-agents)
- [`bookings`](#-bookings)
- [`config`](#-config)
- [`created_packages`](#-created_packages)
- [`creds`](#-creds)
- [`custom_hotels`](#-custom_hotels)
- [`customers`](#-customers)
- [`followupNotifSent`](#-followupnotifsent)
- [`hotels`](#-hotels)
- [`installmentNotifSent`](#-installmentnotifsent)
- [`invoices`](#-invoices)
- [`itinerary_templates`](#-itinerary_templates)
- [`leads`](#-leads)
- [`locations`](#-locations)
- [`meta`](#-meta)
- [`notifications`](#-notifications)
- [`packages`](#-packages)
- [`pushSubscriptions`](#-pushsubscriptions)
- [`saved_packages_by_agents`](#-saved_packages_by_agents)
- [`submissions`](#-submissions)
- [`super_admins`](#-super_admins)
- [`transport`](#-transport)
- [`trips`](#-trips)
- [`users`](#-users)

---

## 📁 `activities`

---

### Sample Document 1 — ID: `Ex4t6zRR2Rv4U7DJeNgf`

```json
{
  "id": "Ex4t6zRR2Rv4U7DJeNgf",
  "name": "Jeep Safari",
  "state": "Rajasthan",
  "city": "Jaisalmer",
  "fitRatePerPerson": 1200,
  "groupRatePerPerson": 1200
}
```

### Sample Document 2 — ID: `F1KcgwR8yv3OGgxFavh5`

```json
{
  "id": "F1KcgwR8yv3OGgxFavh5",
  "name": "Kathakali",
  "state": "Kerala",
  "city": "Thekkady",
  "fitRatePerPerson": 300,
  "groupRatePerPerson": 300
}
```


## 📁 `adminPermissions`

---

### Sample Document 1 — ID: `7IvSTp62EHgwvxB1nY8Oi6o7pJf2`

```json
{
  "id": "7IvSTp62EHgwvxB1nY8Oi6o7pJf2",
  "itinerary_ai": false,
  "hotel_fetch_ai": false
}
```

### Sample Document 2 — ID: `HfLIeXyMn1Mfz1NS881pz3qGqsu2`

```json
{
  "id": "HfLIeXyMn1Mfz1NS881pz3qGqsu2",
  "itinerary_ai": false,
  "hotel_fetch_ai": false
}
```


## 📁 `admins`

---

### Sample Document 1 — ID: `7IvSTp62EHgwvxB1nY8Oi6o7pJf2`

```json
{
  "id": "7IvSTp62EHgwvxB1nY8Oi6o7pJf2",
  "name": "Peeyoosh Tekale",
  "email": "adwaittours.it@gmail.com",
  "phone": "",
  "role": "admin",
  "createdAt": {
    "_seconds": 1752679137,
    "_nanoseconds": 945000000
  },
  "approved": "accepted",
  "uid": "TKZwuAqLaWUd2snVtTHLNscTbLP2"
}
```

### Sample Document 2 — ID: `HfLIeXyMn1Mfz1NS881pz3qGqsu2`

```json
{
  "id": "HfLIeXyMn1Mfz1NS881pz3qGqsu2",
  "name": "Data Loader",
  "email": "data.loader@gmail.com",
  "phone": "+911234567890",
  "role": "admin",
  "createdAt": {
    "_seconds": 1756361740,
    "_nanoseconds": 813000000
  },
  "approved": "accepted"
}
```


## 📁 `agentPermissions`

---

### Sample Document 1 — ID: `57PcGB7A10hhEjl9VyMroOX06wk2`

```json
{
  "id": "57PcGB7A10hhEjl9VyMroOX06wk2",
  "itinerary_ai": false,
  "hotel_fetch_ai": false
}
```

### Sample Document 2 — ID: `A1X1gWdU1rWiUW5ZYtmescnu8vH3`

```json
{
  "id": "A1X1gWdU1rWiUW5ZYtmescnu8vH3",
  "itinerary_ai": true,
  "hotel_fetch_ai": true
}
```


## 📁 `agents`

---

### Sample Document 1 — ID: `57PcGB7A10hhEjl9VyMroOX06wk2`

```json
{
  "id": "57PcGB7A10hhEjl9VyMroOX06wk2",
  "uid": "57PcGB7A10hhEjl9VyMroOX06wk2",
  "name": "VN PATIL",
  "email": "vnpatil.passport@gmail.com",
  "phone": "Not provided",
  "role": "agent",
  "authProvider": "google",
  "hasPassword": false,
  "createdAt": {
    "_seconds": 1775658136,
    "_nanoseconds": 46000000
  },
  "approved": "accepted"
}
```

### Sample Document 2 — ID: `A1X1gWdU1rWiUW5ZYtmescnu8vH3`

```json
{
  "id": "A1X1gWdU1rWiUW5ZYtmescnu8vH3",
  "name": "Rushikesh Gaikwad",
  "email": "rushi@gmail.com",
  "phone": "+917397829548",
  "role": "agent",
  "createdAt": {
    "_seconds": 1767847275,
    "_nanoseconds": 283000000
  },
  "approved": "accepted",
  "adminId": "TKZwuAqLaWUd2snVtTHLNscTbLP2"
}
```


## 📁 `bookings`

---

### Sample Document 1 — ID: `4v3O2MJdC8WtHIddOhMs`

```json
{
  "id": "4v3O2MJdC8WtHIddOhMs",
  "customerName": "Graham Matthews",
  "destination": "",
  "startDate": "2026-05-02",
  "endDate": "2026-05-03",
  "adults": 1,
  "children": 0,
  "status": "Pending",
  "totalAmount": 16200,
  "notes": "Auto-created from quotation ",
  "services": [
    {
      "type": "Hotel",
      "description": "Hotel Taj Mumbai · Luxury Sea View · EP · 1 nights",
      "supplier": "Hotel Taj Mumbai",
      "confirmationRef": "",
      "amount": 9000,
      "advance": "",
      "status": "Pending"
    },
    {
      "type": "Transfer",
      "description": "Bus  (AC)",
      "supplier": "",
      "confirmationRef": "",
      "amount": 7200,
      "advance": "",
      "status": "Pending"
    }
  ],
  "payments": [],
  "quotationId": "Wn8JWim2khzP2BBf6H9e",
  "agentId": "n6sazo1LqDWInaSkX4C8vI3Yf6v1",
  "bookingRef": "BK-2026-6943",
  "createdAt": {
    "_seconds": 1777830308,
    "_nanoseconds": 258000000
  },
  "updatedAt": {
    "_seconds": 1777830308,
    "_nanoseconds": 258000000
  }
}
```

### Sample Document 2 — ID: `5Fh4lsdeu25zAFkzBwO7`

```json
{
  "id": "5Fh4lsdeu25zAFkzBwO7",
  "customerName": "Test Lead",
  "destination": "Karnataka (Coorg, Mysore) \n",
  "startDate": "2026-04-23",
  "endDate": "2026-04-22",
  "adults": 1,
  "children": 0,
  "totalAmount": 31670,
  "notes": "Converted from quotation 1 · Option 1",
  "quotationId": "GGh9ODS1W73MHfaXpWjM",
  "hotelSummary": [
    {
      "numDouble": 2,
      "state": "Karnataka",
      "GoogleListingURL": "https://share.google/y52NvaI9BT6lcXCQ6",
      "hotelTotal": 11000,
      "hotel": "Oxyrich",
      "isCustom": false,
      "selectedRoomCategory": "Deluxe Room",
      "nights": 1,
      "numExtraAdult": 1,
      "checkOutDate": "2026-04-24",
      "city": "Coorg",
      "selectedMealPlan": "MAP",
      "numCNB": 0,
      "numExtraChild": 0,
      "checkInDate": "2026-04-23"
    },
    {
      "checkOutDate": "2026-04-22",
      "numExtraAdult": 1,
      "pricing": {
        "map": {
          "extraChild": 0,
          "extraAdult": 0,
          "cnb": 0,
          "double": 0
        },
        "ap": {
          "double": 0,
          "extraAdult": 0,
          "cnb": 0,
          "extraChild": 0
        },
        "ep": {
          "double": 0,
          "extraAdult": 0,
          "cnb": 0,
          "extraChild": 0
        },
        "cp": {
          "extraChild": 0,
          "cnb": 0,
          "extraAdult": 0,
          "double": 2500
        }
      },
      "selectedRoomCategory": "Deluxe",
      "nights": 1,
      "numCNB": 0,
      "numExtraChild": 0,
      "checkInDate": "2026-04-21",
      "city": "Mysore",
      "selectedMealPlan": "CP",
      "state": "Karnataka",
      "numDouble": 2,
      "isCustom": true,
      "rating": "3",
      "pricePerNight": 5000,
      "hotelTotal": 5000,
      "hotel": "Mysore"
    }
  ],
  "agentId": "UZMhz6GvluW1lBAdOefSv87oBFI2",
  "bookingRef": "BK-2026-3967",
  "createdAt": {
    "_seconds": 1776771136,
    "_nanoseconds": 49000000
  },
  "status": "Confirmed",
  "services": [
    {
      "amount": 11000,
      "advance": "5000",
      "description": "Oxyrich · Deluxe Room · MAP · 1 nights",
      "confirmationRef": "",
      "supplier": "Oxyrich",
      "status": "Pending",
      "type": "Hotel"
    },
    {
      "status": "Pending",
      "type": "Hotel",
      "description": "Mysore · Deluxe · CP · 1 nights",
      "confirmationRef": "",
      "supplier": "Mysore",
      "advance": "2000",
      "amount": 5000
    },
    {
      "amount": 12000,
      "advance": "",
      "description": "SEdan (AC)",
      "confirmationRef": "",
      "supplier": "",
      "type": "Transfer",
      "status": "Pending"
    },
    {
      "description": "Kathakali · Thekkady",
      "confirmationRef": "",
      "supplier": "",
      "type": "Sightseeing",
      "status": "Pending",
      "amount": 1200,
      "advance": ""
    }
  ],
  "paymentStatus": "Partial",
  "vouchers": [
    {
      "id": "1776773172766_nsc70",
      "type": "hotel",
      "hotelName": "Oxyrich",
      "checkIn": "2026-04-23",
      "checkOut": "2026-04-24",
      "city": "Coorg",
      "deleted": false,
      "createdAt": "2026-04-21T12:06:12.766Z"
    }
  ],
  "payments": [
    {
      "amount": 24500,
      "notes": "advance",
      "reference": "vgj5678999",
      "mode": "Bank Transfer",
      "date": "2026-04-21"
    },
    {
      "reference": "",
      "date": "2026-04-21",
      "mode": "Online",
      "amount": 3000,
      "invoicePaymentId": "pay_1776773444949",
      "notes": ""
    }
  ],
  "paidAmount": 27500,
  "updatedAt": {
    "_seconds": 1776773961,
    "_nanoseconds": 782000000
  },
  "adminId": "TKZwuAqLaWUd2snVtTHLNscTbLP2"
}
```


## 📁 `config`

---

### Sample Document 1 — ID: `voucher_counters`

```json
{
  "id": "voucher_counters",
  "invoice_2026": 7,
  "hotel": 341,
  "flight": 156
}
```


## 📁 `created_packages`

---

### Sample Document 1 — ID: `Jvue379QwBaEepKIdqLC`

```json
{
  "id": "Jvue379QwBaEepKIdqLC",
  "packageName": "5 days kashmir",
  "baseLocation": "mumbai",
  "duration": {
    "days": "3",
    "nights": "3"
  },
  "transport": {
    "id": "c2d76120-8f3e-4293-a01d-0e26af47d11a",
    "days": 5,
    "nights": 4,
    "vehicles": [
      {
        "price": 19000,
        "type": "Sedan",
        "ac": true,
        "seating": 4
      },
      {
        "type": "Ertiga",
        "seating": 5,
        "ac": true,
        "price": 19500
      },
      {
        "type": "Innova",
        "ac": true,
        "seating": 6,
        "price": 20000
      },
      {
        "ac": true,
        "type": "Crysta",
        "seating": null,
        "price": null
      },
      {
        "price": null,
        "seating": 7,
        "type": "Innova 7 Seater",
        "ac": true
      },
      {
        "type": "Crysta 7 Seater",
        "price": null,
        "ac": true,
        "seating": 7
      },
      {
        "seating": null,
        "price": null,
        "type": "Tempo Traveller - Non AC",
        "ac": false
      },
      {
        "price": null,
        "seating": null,
        "ac": true,
        "type": "Tempo Traveller - AC"
      }
    ],
    "createdAt": "2026-01-07T05:47:56.962Z",
    "description": "",
    "pricingType": "lumpsum",
    "name": "5 days kerala - munnar thekke]dy alleppy",
    "selectedVehicle": {
      "type": "Innova",
      "ac": true,
      "seating": 6,
      "price": 20000
    },
    "totalPrice": 20000
  },
  "days": [
    {
      "dayNumber": 1,
      "city": "kerala",
      "hotel": null,
      "activities": [
        {
          "id": "2f72jeUBhh9syZGu4UbU",
          "name": "Zip Line",
          "fitRatePerPerson": 300,
          "groupRatePerPerson": 250,
          "city": "Dalhousie",
          "state": "Himachal Pradesh"
        },
        {
          "id": "4d8OdqrAtrbrfG8aK2i4",
          "state": "Rajasthan",
          "groupRatePerPerson": 2200,
          "name": "Rajasthan Food Tour",
          "city": "Jaipur",
          "fitRatePerPerson": 2500
        },
        {
          "id": "8GlGZI2psbYdrWVATPJ5",
          "fitRatePerPerson": 2500,
          "state": "Himachal Pradesh",
          "name": "Hot Air Ballooning  (equipments & instructor)",
          "city": "Manali",
          "groupRatePerPerson": 2000
        }
      ],
      "hotelTotal": [
        0
      ],
      "selectedMealPlan": "",
      "selectedRoomCategory": ""
    },
    {
      "dayNumber": 2,
      "city": "",
      "hotel": null,
      "activities": [],
      "hotelTotal": [
        0
      ],
      "selectedMealPlan": "",
      "selectedRoomCategory": ""
    },
    {
      "dayNumber": 3,
      "city": "",
      "hotel": null,
      "activities": [],
      "hotelTotal": [
        0
      ],
      "selectedMealPlan": "",
      "selectedRoomCategory": ""
    }
  ],
  "totalBaseCost": 0,
  "status": "draft",
  "createdAt": {
    "_seconds": 1768332974,
    "_nanoseconds": 206000000
  }
}
```


## 📁 `creds`

---

### Sample Document 1 — ID: `Ufq3kG5ahEuV66siNJof`

```json
{
  "id": "Ufq3kG5ahEuV66siNJof",
  "username": "admin",
  "role": "super_admin",
  "password": "Admin@123"
}
```


## 📁 `custom_hotels`

---

### Sample Document 1 — ID: `3fAjy7v3sOunUClYk0W5`

```json
{
  "id": "3fAjy7v3sOunUClYk0W5",
  "name": "temp hotel",
  "city": "demo city",
  "state": "Maharashtra",
  "rating": "3",
  "roomType": "deluxe",
  "pricing": {
    "ep": {
      "double": 3000,
      "extraAdult": 0,
      "extraChild": 0,
      "cnb": 0
    },
    "cp": {
      "double": 4200,
      "extraAdult": 0,
      "extraChild": 0,
      "cnb": 0
    },
    "map": {
      "double": 5000,
      "extraAdult": 0,
      "extraChild": 0,
      "cnb": 0
    },
    "ap": {
      "double": 5600,
      "extraAdult": 0,
      "extraChild": 0,
      "cnb": 0
    }
  },
  "lastUsedMealPlan": "AP",
  "updatedAt": {
    "_seconds": 1771403513,
    "_nanoseconds": 773000000
  },
  "createdAt": {
    "_seconds": 1771403513,
    "_nanoseconds": 773000000
  }
}
```

### Sample Document 2 — ID: `Dn2GNjUkTtYIF43Knnti`

```json
{
  "id": "Dn2GNjUkTtYIF43Knnti",
  "name": "hotel test",
  "city": "xyz",
  "state": "Andhra Pradesh",
  "rating": "3",
  "roomType": "deluxe",
  "pricing": {
    "ep": {
      "double": 5000,
      "extraAdult": 0,
      "extraChild": 0,
      "cnb": 0
    },
    "cp": {
      "double": 0,
      "extraAdult": 0,
      "extraChild": 0,
      "cnb": 0
    },
    "map": {
      "double": 0,
      "extraAdult": 0,
      "extraChild": 0,
      "cnb": 0
    },
    "ap": {
      "double": 0,
      "extraAdult": 0,
      "extraChild": 0,
      "cnb": 0
    }
  },
  "lastUsedMealPlan": "EP",
  "updatedAt": {
    "_seconds": 1772526911,
    "_nanoseconds": 288000000
  },
  "createdAt": {
    "_seconds": 1772526911,
    "_nanoseconds": 288000000
  }
}
```


## 📁 `customers`

---

### Sample Document 1 — ID: `0fbMNwSXvHCcYyel6H52`

```json
{
  "id": "0fbMNwSXvHCcYyel6H52",
  "email": "mtshaikh5667@gmail.com",
  "status": "New",
  "date": "4/25/2026",
  "normalizedEmail": "mtshaikh5667@gmail.com",
  "normalizedMobile": "8826797417",
  "createdAt": {
    "_seconds": 1777115800,
    "_nanoseconds": 399000000
  },
  "assignedAgentId": "nWWRYMl8qtSp6QffPz3jCRicaZP2",
  "assignedAgentName": "Maryam",
  "mobile": "8826797419",
  "state": "Maharashtra",
  "city": "Nagpur",
  "name": "testing_upddate",
  "updatedAt": {
    "_seconds": 1777412251,
    "_nanoseconds": 424000000
  }
}
```

### Sample Document 2 — ID: `0tfaP5L09t4pMcNQBdlO`

```json
{
  "id": "0tfaP5L09t4pMcNQBdlO",
  "name": "Mitali Dinesh Lomte",
  "age": "20",
  "gender": "Female",
  "preference": "Lower",
  "address": "Pundlik Nagar, Pahade corner, chh. Sambhajinagar ",
  "mobile": "9607307188",
  "email": "mitali6321@gmail.com",
  "tripId": "Ywp8PEZC3cGaXrRZB4TM",
  "tripName": "MGM-09/04/2026",
  "agentId": "BtYbknb4isOKZLxUAWZpIZUGu652",
  "createdAt": {
    "_seconds": 1773038935,
    "_nanoseconds": 817000000
  },
  "updatedAt": {
    "_seconds": 1773038935,
    "_nanoseconds": 817000000
  }
}
```


## 📁 `followupNotifSent`

---

### Sample Document 1 — ID: `9Few9gdkDh1OxSKeTm5l_0uca8cVEDSOdtk3qBtUw_overdue_2026-05-08`

```json
{
  "id": "9Few9gdkDh1OxSKeTm5l_0uca8cVEDSOdtk3qBtUw_overdue_2026-05-08",
  "agentId": "n6sazo1LqDWInaSkX4C8vI3Yf6v1",
  "leadId": "9Few9gdkDh1OxSKeTm5l",
  "followupId": "0uca8cVEDSOdtk3qBtUw",
  "triggerType": "overdue",
  "sentAt": {
    "_seconds": 1778208600,
    "_nanoseconds": 574000000
  }
}
```

### Sample Document 2 — ID: `9Few9gdkDh1OxSKeTm5l_0uca8cVEDSOdtk3qBtUw_overdue_2026-05-09`

```json
{
  "id": "9Few9gdkDh1OxSKeTm5l_0uca8cVEDSOdtk3qBtUw_overdue_2026-05-09",
  "agentId": "n6sazo1LqDWInaSkX4C8vI3Yf6v1",
  "leadId": "9Few9gdkDh1OxSKeTm5l",
  "followupId": "0uca8cVEDSOdtk3qBtUw",
  "triggerType": "overdue",
  "sentAt": {
    "_seconds": 1778295000,
    "_nanoseconds": 336000000
  }
}
```


## 📁 `hotels`

---

### Sample Document 1 — ID: `3h0m4dJOay195tXaklA8`

```json
{
  "id": "3h0m4dJOay195tXaklA8",
  "name": "Jungle Park Resort",
  "GoogleReviewRating": "4.1",
  "GoogleListingURL": "https://share.google/KKRGlcOsQUrNY2Uv1",
  "rating": "3-star",
  "state": "Kerala",
  "city": "Thekkady",
  "seasonCleanupAt": "2026-05-04T00:00:00.000Z",
  "rooms": [
    {
      "categoryName": "Jungle View Deluxe (NonAC)",
      "seasons": [
        {
          "name": "Season",
          "start": "2026-01-05",
          "end": "2026-03-31",
          "pricing": {
            "ep": {
              "double": 0,
              "extraAdult": 0,
              "extraChild": 0
            },
            "cp": {
              "double": 3100,
              "extraAdult": 800,
              "extraChild": 600
            },
            "map": {
              "double": 4400,
              "extraAdult": 1450,
              "extraChild": 1000
            },
            "ap": {
              "double": 0,
              "extraAdult": 0,
              "extraChild": 0
            }
          }
        }
      ]
    },
    {
      "categoryName": "Jungle View Venus AC",
      "seasons": [
        {
          "name": "Season",
          "start": "2026-01-05",
          "end": "2026-03-31",
          "pricing": {
            "ep": {
              "double": 0,
              "extraAdult": 0,
              "extraChild": 0
            },
            "cp": {
              "double": 3600,
              "extraAdult": 800,
              "extraChild": 600
            },
            "map": {
              "double": 4400,
              "extraAdult": 1450,
              "extraChild": 1000
            },
            "ap": {
              "double": 0,
              "extraAdult": 0,
              "extraChild": 0
            }
          }
        }
      ]
    },
    {
      "categoryName": "Deluxe Family Room Triple (NonAC)",
      "seasons": [
        {
          "name": "Season",
          "start": "2026-01-05",
          "end": "2026-03-31",
          "pricing": {
            "ep": {
              "double": 0,
              "extraAdult": 0,
              "extraChild": 0
            },
            "cp": {
              "double": 2900,
              "extraAdult": 800,
              "extraChild": 600
            },
            "map": {
              "double": 4200,
              "extraAdult": 1450,
              "extraChild": 1000
            },
            "ap": {
              "double": 0,
              "extraAdult": 0,
              "extraChild": 0
            }
          }
        }
      ]
    },
    {
      "categoryName": "Jungle View Family 4pax (NonAc)",
      "seasons": [
        {
          "name": "Season",
          "start": "2026-01-05",
          "end": "2026-03-31",
          "pricing": {
            "ep": {
              "double": 0,
              "extraAdult": 0,
              "extraChild": 0
            },
            "cp": {
              "double": 3900,
              "extraAdult": 800,
              "extraChild": 600
            },
            "map": {
              "double": 5200,
              "extraAdult": 1450,
              "extraChild": 1000
            },
            "ap": {
              "double": 0,
              "extraAdult": 0,
              "extraChild": 0
            }
          }
        }
      ]
    },
    {
      "categoryName": "Jungle View Family - 4pax (AC)",
      "seasons": [
        {
          "name": "Season",
          "start": "2026-01-05",
          "end": "2026-03-31",
          "pricing": {
            "ep": {
              "double": 0,
              "extraAdult": 0,
              "extraChild": 0
            },
            "cp": {
              "double": 4400,
              "extraAdult": 800,
              "extraChild": 600
            },
            "map": {
              "double": 5700,
              "extraAdult": 1450,
              "extraChild": 1000
            },
            "ap": {
              "double": 0,
              "extraAdult": 0,
              "extraChild": 0
            }
          }
        }
      ]
    }
  ],
  "updatedAt": "2026-05-04T00:00:00.000Z"
}
```

### Sample Document 2 — ID: `3tax4fpXVU8yRksbVwdn`

```json
{
  "id": "3tax4fpXVU8yRksbVwdn",
  "name": "La Serene Resort By DLS Hotels",
  "rating": "4-star",
  "state": "Himachal Pradesh",
  "city": "Manali",
  "seasonCleanupAt": "2026-05-04T00:00:00.000Z",
  "rooms": [
    {
      "categoryName": "Deluxe Room",
      "seasons": []
    },
    {
      "categoryName": "Super Deluxe Room",
      "seasons": [
        {
          "name": "Season 2",
          "start": "",
          "end": "",
          "pricing": {
            "ep": {
              "double": 4000,
              "extraAdult": 700,
              "extraChild": 700
            },
            "cp": {
              "double": 4500,
              "extraAdult": 900,
              "extraChild": 900
            },
            "map": {
              "double": 5000,
              "extraAdult": 1200,
              "extraChild": 1200
            },
            "ap": {
              "double": 0,
              "extraAdult": 0,
              "extraChild": 0
            }
          }
        }
      ]
    },
    {
      "categoryName": "Honeymoon Suite",
      "seasons": []
    },
    {
      "categoryName": "Famliy Suite ( 3 Bedded )",
      "seasons": []
    },
    {
      "categoryName": "Famliy Suite ( 4 Bedded )",
      "seasons": []
    }
  ],
  "updatedAt": "2026-05-04T00:00:00.000Z"
}
```


## 📁 `installmentNotifSent`

---

### Sample Document 1 — ID: `117MPuKdFHVWUmqjogVL__svc1__pay2__due_today__2026-05-03`

```json
{
  "id": "117MPuKdFHVWUmqjogVL__svc1__pay2__due_today__2026-05-03",
  "agentId": "n6sazo1LqDWInaSkX4C8vI3Yf6v1",
  "source": "client/useInstallmentAlerts",
  "trigger": "due_today",
  "sentAt": {
    "_seconds": 1777814170,
    "_nanoseconds": 818000000
  },
  "bookingId": "117MPuKdFHVWUmqjogVL"
}
```

### Sample Document 2 — ID: `117MPuKdFHVWUmqjogVL__svc1__pay2__overdue__2026-05-04`

```json
{
  "id": "117MPuKdFHVWUmqjogVL__svc1__pay2__overdue__2026-05-04",
  "agentId": "n6sazo1LqDWInaSkX4C8vI3Yf6v1",
  "source": "client/useInstallmentAlerts",
  "trigger": "overdue",
  "sentAt": {
    "_seconds": 1777833591,
    "_nanoseconds": 786000000
  },
  "bookingId": "117MPuKdFHVWUmqjogVL"
}
```


## 📁 `invoices`

---

### Sample Document 1 — ID: `AOhI8RnaiPjAMz9GwEWH`

```json
{
  "id": "AOhI8RnaiPjAMz9GwEWH",
  "customerName": "Riya Rathi",
  "customerEmail": "piyushtekale+11@gmail.com",
  "customerMobile": "5588558855",
  "customerAddress": "Pune",
  "customerId": "KZSAnHrfXu9NVnUtZQXH",
  "invoiceDate": "2026-04-21",
  "dueDate": "2026-04-30",
  "status": "Draft",
  "gstType": "intra",
  "notes": "Notes & TermsNotes & TermsNotes & TermsNotes & Terms",
  "termsAndConditions": "Notes & TermsNotes & TermsNotes & TermsNotes & Terms",
  "sourceType": "manual",
  "bookingId": null,
  "quotationId": null,
  "leadId": null,
  "bookingRef": "",
  "agentId": "UZMhz6GvluW1lBAdOefSv87oBFI2",
  "invoiceNumber": "ADW-INV-2026-0001",
  "discountTotal": 0,
  "igst": 0,
  "createdAt": {
    "_seconds": 1776769710,
    "_nanoseconds": 20000000
  },
  "payments": [
    {
      "amount": 2000,
      "date": "2026-04-21",
      "paymentAccountId": "",
      "paymentAccountName": "Bank Transfer",
      "paymentAccountType": "",
      "mode": "Bank Transfer",
      "reference": "",
      "notes": "",
      "id": "pay_1776769748642"
    },
    {
      "amount": 1000,
      "date": "2026-04-21",
      "paymentAccountId": "",
      "paymentAccountName": "UPI",
      "paymentAccountType": "",
      "mode": "UPI",
      "reference": "456789876789",
      "notes": "jkvjdhakdhakb jhacvalkbcaklc wils klsa ckls",
      "id": "pay_1776769778410"
    }
  ],
  "sgst": 150,
  "lineItems": [
    {
      "taxableAmount": 4000,
      "gstAmount": 200,
      "gstRate": 5,
      "quantity": 4,
      "unitPrice": "1000",
      "subtotal": 4000,
      "discountType": "percentage",
      "discountValue": 0,
      "description": "Shimla Manali Trip",
      "discountAmount": 0,
      "total": 4200
    },
    {
      "taxableAmount": 2000,
      "gstAmount": 100,
      "gstRate": 5,
      "unitPrice": "2000",
      "quantity": 1,
      "discountValue": 0,
      "discountType": "percentage",
      "subtotal": 2000,
      "discountAmount": 0,
      "total": 2100,
      "description": "Extra person"
    }
  ],
  "amountDue": 6300,
  "taxableAmount": 6000,
  "grandTotal": 6300,
  "subtotal": 6000,
  "gstTotal": 300,
  "cgst": 150,
  "paymentStatus": "Unpaid",
  "amountReceived": 0,
  "updatedAt": {
    "_seconds": 1776769836,
    "_nanoseconds": 910000000
  }
}
```

### Sample Document 2 — ID: `JE2yPcj1qORepm8B2WVp`

```json
{
  "id": "JE2yPcj1qORepm8B2WVp",
  "customerName": "testing_upddate",
  "customerEmail": "mtshaikh5667@gmail.com",
  "customerMobile": "8826797419",
  "customerAddress": "",
  "customerId": "0fbMNwSXvHCcYyel6H52",
  "invoiceDate": "2026-04-28",
  "dueDate": "",
  "status": "Draft",
  "gstType": "intra",
  "lineItems": [
    {
      "itemName": "",
      "description": "",
      "quantity": 6,
      "unitPrice": "400",
      "discountType": "percentage",
      "discountValue": 0,
      "gstRate": 0,
      "subtotal": 2400,
      "discountAmount": 0,
      "taxableAmount": 2400,
      "gstAmount": 0,
      "total": 2400
    }
  ],
  "notes": "",
  "termsAndConditions": "",
  "sourceType": "manual",
  "bookingId": null,
  "quotationId": null,
  "leadId": null,
  "bookingRef": "",
  "agentId": "nWWRYMl8qtSp6QffPz3jCRicaZP2",
  "invoiceNumber": "ADW-INV-2026-0004",
  "subtotal": 2400,
  "discountTotal": 0,
  "taxableAmount": 2400,
  "gstTotal": 0,
  "grandTotal": 2400,
  "cgst": 0,
  "sgst": 0,
  "igst": 0,
  "amountReceived": 0,
  "amountDue": 2400,
  "paymentStatus": "Unpaid",
  "payments": [],
  "createdAt": {
    "_seconds": 1777412333,
    "_nanoseconds": 939000000
  },
  "updatedAt": {
    "_seconds": 1777412333,
    "_nanoseconds": 939000000
  }
}
```


## 📁 `itinerary_templates`

---

### Sample Document 1 — ID: `PJZRGxvRsmGGYmkFwchg`

```json
{
  "id": "PJZRGxvRsmGGYmkFwchg",
  "title": "11-Day Exploration of Arunachal Pradesh and Assam",
  "states": [
    "Arunachal Pradesh",
    "Assam"
  ],
  "state": "Arunachal Pradesh",
  "cities": [
    "Guwahati",
    "Bomdila",
    "Tawang",
    "Bhalukpong",
    "Kaziranga"
  ],
  "startCity": "Guwahati",
  "endCity": "Guwahati",
  "numDays": 11,
  "tags": [],
  "isActive": true,
  "posterImage": null,
  "days": [
    {
      "id": "id-1776845971623-zkc9u",
      "dayNumber": 1,
      "title": "Arrival in Guwahati",
      "description": "• Arrive at Guwahati Airport (GAU).\n• You will be greeted by our representative and transferred to your hotel.\n• Check in at the hotel and relax.\n• In the evening, if time permits, visit the Umananda Temple.\n• Meal Plan: No Meals",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776845971623-l9i7r",
      "dayNumber": 2,
      "title": "Guwahati to Bomdila",
      "description": "• After breakfast, check out from the hotel.\n• Embark on a scenic drive to Bomdila in Arunachal Pradesh (approx. 8-9 hours).\n• En route, enjoy the changing landscapes and lush greenery.\n• Check in at your hotel in Bomdila upon arrival.\n• Relax and acclimatize to the mountain environment.\n• Meal Plan: Breakfast",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776845971623-y82cf",
      "dayNumber": 3,
      "title": "Bomdila Sightseeing",
      "description": "• After breakfast, explore Bomdila.\n• Visit the Bomdila Monastery, a significant Buddhist center.\n• Explore the local market to experience the Monpa culture.\n• Visit the ethnographic museum to learn about the local tribes.\n• Enjoy the panoramic views of the Himalayas from strategic viewpoints.\n• Meal Plan: Breakfast",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776845971623-rcqkr",
      "dayNumber": 4,
      "title": "Bomdila to Tawang",
      "description": "• After breakfast, check out and drive towards Tawang (approx. 5-6 hours).\n• The journey offers breathtaking views of snow-capped mountains and deep valleys.\n• Cross the Sela Pass, one of the highest motorable passes in the world.\n• Visit the serene Sela Lake.\n• Arrive in Tawang and check into your hotel.\n• Meal Plan: Breakfast",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776845971623-9sx6k",
      "dayNumber": 5,
      "title": "Tawang Monastery and Local Sightseeing",
      "description": "• After breakfast, visit the magnificent Tawang Monastery, the second-largest monastery in the world.\n• Explore the monastery complex and witness the monastic life.\n• Visit the Tawang War Memorial, dedicated to soldiers who fought in the 1962 war.\n• Visit the Urgelling Monastery, the birthplace of the 6th Dalai Lama.\n• Meal Plan: Breakfast",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776845971623-t22xq",
      "dayNumber": 6,
      "title": "Tawang Local Exploration",
      "description": "• After breakfast, take a day excursion.\n• Visit the serene PTSang Lake and Ani Gompa (nunnery).\n• Enjoy the stunning natural beauty surrounding Tawang.\n• You can also explore the local markets for souvenirs.\n• Meal Plan: Breakfast",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776845971623-kxsko",
      "dayNumber": 7,
      "title": "Tawang to Bhalukpong",
      "description": "• After breakfast, check out from your hotel.\n• Begin your journey back towards Bhalukpong (approx. 6-7 hours).\n• Enjoy the return scenic drive through the picturesque landscapes.\n• Arrive in Bhalukpong, a town located on the banks of the Kameng River.\n• Check into your hotel and relax.\n• Meal Plan: Breakfast",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776845971623-dbhd9",
      "dayNumber": 8,
      "title": "Bhalukpong to Kaziranga",
      "description": "• After breakfast, check out from the hotel.\n• Drive towards Kaziranga National Park in Assam (approx. 4-5 hours).\n• Check into your resort near Kaziranga.\n• In the afternoon, enjoy a jeep safari in the Central Range of Kaziranga National Park.\n• Spot the endangered one-horned rhinoceros, tigers, elephants, and various bird species.\n• Meal Plan: Breakfast",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776845971623-hj4rn",
      "dayNumber": 9,
      "title": "Kaziranga National Park Exploration",
      "description": "• Early morning, enjoy an elephant safari in the Western or Eastern Range of Kaziranga National Park.\n• After breakfast, you can opt for another jeep safari or explore the nearby areas.\n• Visit the Kaziranga National Orchid and Biodiversity Park.\n• Learn about the diverse flora and fauna of the region.\n• Meal Plan: Breakfast",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776845971623-emfyg",
      "dayNumber": 10,
      "title": "Kaziranga to Guwahati",
      "description": "• After a leisurely breakfast, check out from your hotel.\n• Drive back to Guwahati (approx. 4-5 hours).\n• Upon arrival in Guwahati, check into your hotel.\n• In the evening, you can visit the famous Kamakhya Temple, a significant Hindu pilgrimage site.\n• Meal Plan: Breakfast",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776845971623-vngzs",
      "dayNumber": 11,
      "title": "Departure from Guwahati",
      "description": "• After breakfast, check out from the hotel.\n• Depending on your flight schedule, you may have time for some last-minute souvenir shopping.\n• Proceed to Guwahati Airport (GAU) for your onward journey.\n• Meal Plan: Breakfast",
      "activityIds": [],
      "images": []
    }
  ],
  "inclusions": [
    {
      "id": "id-1776845958323-r83mz",
      "text": "Hotel to Airport transfer on the day of departure.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-nv7t3",
      "text": "All tours & transfers are on a shared coach basis.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-udyro",
      "text": "Airport to Hotel transfer on the day of arrival.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-hx1c4",
      "text": "All sightseeing entry fees",
      "selected": true,
      "isDefault": true
    }
  ],
  "exclusions": [
    {
      "id": "id-1776845958323-3maub",
      "text": "International or domestic flight tickets unless specified.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-hmf27",
      "text": "Any item of personal nature like tips, laundry, telephone calls etc.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-fxnyq",
      "text": "Any other sightseeing other than those mentioned in the inclusions section.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-pr01v",
      "text": "Any fee for video or camera permit.",
      "selected": true,
      "isDefault": true
    }
  ],
  "tnc": [
    {
      "id": "id-1776845958323-z555c",
      "text": "No rooms are booked or blocked yet, Rooms are subjected to availability.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-er9ec",
      "text": "Package cost will vary depends on currency fluctuations.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-kzqgw",
      "text": "No flights are booked or blocked yet, Airfare & Seats are subjected to availability.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-obt6w",
      "text": "Itinerary may change but the inclusions will remain same.",
      "selected": true,
      "isDefault": true
    }
  ],
  "cancellation": [
    {
      "id": "id-1776845958323-pjf2y",
      "text": "These are non-refundable amounts as per the current components attached.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-gaut7",
      "text": "Please check the exact cancellation and date change policy on the review page before proceeding further.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-apbqj",
      "text": "Please note, TCS once collected cannot be refunded in case of any cancellation / modification.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-lad0k",
      "text": "Cancellation charges shown is exclusive of all taxes and taxes will be added as per applicable.",
      "selected": true,
      "isDefault": true
    }
  ],
  "impInfo": [
    {
      "id": "id-1776845958323-7ez3o",
      "text": "Ensure your passport is valid for at least six months beyond your intended date of return.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-9n8dc",
      "text": "Make sure you have enough blank pages for visa stamps.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-ec8ff",
      "text": "Obtain the appropriate visa (eg., tourist visa) for your destination country.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-x0mrp",
      "text": "Ensure the visa covers your entire stay.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-byqel",
      "text": "Ensure your travel insurance covers medical emergencies, trip cancellations, and loss of belongings.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-jv2zs",
      "text": "Carry a copy of your travel insurance policy.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-ces6w",
      "text": "Carry an additional government-issued ID (e.g., Aadhar card, driving license).",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776845958323-0lleb",
      "text": "Some countries may require proof of COVID-19 vaccination.",
      "selected": true,
      "isDefault": true
    }
  ],
  "durationNights": 10,
  "version": 1,
  "status": "Published",
  "clientRole": "admin",
  "clientId": "eREJbeJKq3crs3kgdmOTb3Oit9P2",
  "createdAt": {
    "_seconds": 1776845972,
    "_nanoseconds": 599000000
  },
  "updatedAt": {
    "_seconds": 1776845972,
    "_nanoseconds": 599000000
  }
}
```

### Sample Document 2 — ID: `zwdKbvbq62dXpPAm2vyh`

```json
{
  "id": "zwdKbvbq62dXpPAm2vyh",
  "title": "7N8D Assam & Nagaland Cultural Exploration",
  "states": [
    "Assam",
    "Nagaland"
  ],
  "state": "Assam",
  "cities": [
    "Guwahati",
    "Kohima",
    "Dimapur"
  ],
  "startCity": "Guwahati",
  "endCity": "Dimapur",
  "numDays": 8,
  "tags": [],
  "isActive": true,
  "posterImage": null,
  "days": [
    {
      "id": "id-1776844225221-87wpm",
      "dayNumber": 1,
      "title": "Arrival in Guwahati",
      "description": "• Arrive at Lokpriya Gopinath Bordoloi International Airport (GAU) in Guwahati.\n• You will be met by our representative and transferred to your hotel.\n• Check in at the hotel and relax for a while.\n• Depending on your arrival time, you may have the option for a short local exploration.\n• Meal Plan: As per selected hotel meal plans",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776844225221-nnkcd",
      "dayNumber": 2,
      "title": "Guwahati City Tour",
      "description": "• After breakfast at the hotel around 8:00 AM, embark on a city tour.\n• 09:00 AM – Visit the Kamakhya Temple, a significant Hindu pilgrimage site located atop Nilachal Hill.\n• 11:00 AM – Explore the Assam State Museum to learn about the region's rich history and culture.\n• 01:00 PM – Enjoy lunch at a local restaurant.\n• 02:30 PM – Visit the Umananda Temple, situated on a small island in the Brahmaputra River.\n• 04:00 PM – Take a stroll through the Fancy Bazaar for local shopping.\n• 08:00 PM – Dinner at the hotel or a local restaurant.\n• Meal Plan: As per selected hotel meal plans",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776844225221-ixgh1",
      "dayNumber": 3,
      "title": "Guwahati to Kohima",
      "description": "• After an early breakfast, check out from your hotel around 7:30 AM.\n• Embark on a scenic drive to Kohima, the capital of Nagaland (approx. 5-6 hours).\n• Arrive in Kohima by early afternoon and check into your hotel.\n• After settling in, proceed for a brief local sightseeing tour.\n• 03:00 PM – Visit the Kohima War Cemetery, a poignant memorial to the soldiers who fought in World War II.\n• 04:30 PM – Explore the Nagaland State Museum to understand the diverse Naga tribes and their traditions.\n• 08:00 PM – Dinner at the hotel.\n• Meal Plan: As per selected hotel meal plans",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776844225221-azy3h",
      "dayNumber": 4,
      "title": "Kohima Heritage & Culture",
      "description": "• After breakfast at the hotel around 8:30 AM, explore Kohima further.\n• 09:30 AM – Visit the iconic Kisama Heritage Village, the venue for the Hornbill Festival (if not festival time, it remains a significant cultural site).\n• 11:30 AM – Explore the quaint Angami Naga village of Khonoma, known for its stunning terraced fields and conservation efforts (allow travel time).\n• 01:30 PM – Enjoy lunch in Kohima or en route to Khonoma.\n• 03:30 PM – Return to Kohima and visit the Deputy Commissioner's bungalow and the site of the former British Residency.\n• 07:00 PM – Free time for relaxation or local market exploration.\n• 08:00 PM – Dinner at the hotel.\n• Meal Plan: As per selected hotel meal plans",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776844225221-mgeai",
      "dayNumber": 5,
      "title": "Kohima Excursion to Kigwema & Jakhama",
      "description": "• After breakfast around 8:00 AM, embark on an excursion to explore nearby villages.\n• 09:00 AM – Visit Kigwema Village, known for its traditional architecture and community life.\n• 11:00 AM – Proceed to Jakhama Village, another charming Angami settlement.\n• 01:00 PM – Return to Kohima for lunch.\n• 02:30 PM – Visit the Kohima Village (Bara Basti), one of the largest and most traditional Angami villages.\n• 04:30 PM – Leisure time for souvenir shopping or enjoying the local ambiance.\n• 08:00 PM – Dinner at a local restaurant to sample Naga cuisine.\n• Meal Plan: As per selected hotel meal plans",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776844225221-ri629",
      "dayNumber": 6,
      "title": "Kohima to Dimapur",
      "description": "• Enjoy breakfast at the hotel.\n• Check out from your hotel around 9:00 AM and drive towards Dimapur (approx. 3-4 hours).\n• En route, you can stop at Piphema Tourist Village for panoramic views (time permitting).\n• Arrive in Dimapur by afternoon and check into your hotel.\n• 03:00 PM – Visit the Dimapur Ao Baptist Church, a significant religious landmark.\n• 04:00 PM – Explore the Kachari Ruins, ancient ruins believed to be from the Kachari Kingdom.\n• 08:00 PM – Dinner at the hotel.\n• Meal Plan: As per selected hotel meal plans",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776844225221-hm1sj",
      "dayNumber": 7,
      "title": "Dimapur Exploration",
      "description": "• After breakfast at the hotel around 8:30 AM, proceed for sightseeing in and around Dimapur.\n• 09:30 AM – Visit the Diezephe Craft Village, known for its intricate wood carvings and handicrafts.\n• 11:30 AM – Explore the Green Park, a recreational area offering a peaceful environment.\n• 01:00 PM – Enjoy lunch at a local restaurant.\n• 02:30 PM – Visit the Zoological Park, home to various flora and fauna of the region.\n• 04:30 PM – Spend time at the shopping areas for local Naga crafts and souvenirs.\n• 08:00 PM – Farewell dinner at the hotel.\n• Meal Plan: As per selected hotel meal plans",
      "activityIds": [],
      "images": []
    },
    {
      "id": "id-1776844225221-f80ew",
      "dayNumber": 8,
      "title": "Departure from Dimapur",
      "description": "• Enjoy a final breakfast at your hotel.\n• Check out from the hotel around 10:00 AM.\n• Depending on your flight schedule, you may have some free time for last-minute souvenir shopping.\n• Transfer to Dimapur Airport (DMU) for your onward journey.\n• Meal Plan: As per selected hotel meal plans",
      "activityIds": [],
      "images": []
    }
  ],
  "inclusions": [
    {
      "id": "id-1776844143808-ufzuq",
      "text": "Hotel to Airport transfer on the day of departure.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143808-2gqsw",
      "text": "All tours & transfers are on a shared coach basis.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143808-9wa87",
      "text": "Airport to Hotel transfer on the day of arrival.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143808-ldtse",
      "text": "All sightseeing entry fees",
      "selected": true,
      "isDefault": true
    }
  ],
  "exclusions": [
    {
      "id": "id-1776844143808-4nms6",
      "text": "International or domestic flight tickets unless specified.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143808-cgw7d",
      "text": "Any item of personal nature like tips, laundry, telephone calls etc.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143808-70xdh",
      "text": "Any other sightseeing other than those mentioned in the inclusions section.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143808-g5vxh",
      "text": "Any fee for video or camera permit.",
      "selected": true,
      "isDefault": true
    }
  ],
  "tnc": [
    {
      "id": "id-1776844143809-6ihhb",
      "text": "No rooms are booked or blocked yet, Rooms are subjected to availability.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143809-hbz2y",
      "text": "Package cost will vary depends on currency fluctuations.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143809-nac9r",
      "text": "No flights are booked or blocked yet, Airfare & Seats are subjected to availability.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143809-kwy02",
      "text": "Itinerary may change but the inclusions will remain same.",
      "selected": true,
      "isDefault": true
    }
  ],
  "cancellation": [
    {
      "id": "id-1776844143809-cboyg",
      "text": "These are non-refundable amounts as per the current components attached.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143809-yixfd",
      "text": "Please check the exact cancellation and date change policy on the review page before proceeding further.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143809-xplet",
      "text": "Please note, TCS once collected cannot be refunded in case of any cancellation / modification.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143809-wejty",
      "text": "Cancellation charges shown is exclusive of all taxes and taxes will be added as per applicable.",
      "selected": true,
      "isDefault": true
    }
  ],
  "impInfo": [
    {
      "id": "id-1776844143809-ehj2a",
      "text": "Ensure your passport is valid for at least six months beyond your intended date of return.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143809-zl2qe",
      "text": "Make sure you have enough blank pages for visa stamps.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143809-h5vdk",
      "text": "Obtain the appropriate visa (eg., tourist visa) for your destination country.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143809-vmly7",
      "text": "Ensure the visa covers your entire stay.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143809-5q2o6",
      "text": "Ensure your travel insurance covers medical emergencies, trip cancellations, and loss of belongings.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143809-i2ocp",
      "text": "Carry a copy of your travel insurance policy.",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143809-ny47x",
      "text": "Carry an additional government-issued ID (e.g., Aadhar card, driving license).",
      "selected": true,
      "isDefault": true
    },
    {
      "id": "id-1776844143809-yjom3",
      "text": "Some countries may require proof of COVID-19 vaccination.",
      "selected": true,
      "isDefault": true
    }
  ],
  "durationNights": 7,
  "version": 1,
  "status": "Published",
  "clientRole": "agent",
  "clientId": "hn5zdtypp9Mmx18AW2wgaClLU943",
  "createdAt": {
    "_seconds": 1776844231,
    "_nanoseconds": 609000000
  },
  "updatedAt": {
    "_seconds": 1776844231,
    "_nanoseconds": 609000000
  }
}
```


## 📁 `leads`

---

### Sample Document 1 — ID: `7hnwuzcrursy6OpZvZ70`

```json
{
  "id": "7hnwuzcrursy6OpZvZ70",
  "name": "Graham Matthews",
  "email": "sykuqa@mailinator.com",
  "mobile": "",
  "travelDate": "1981-07-13",
  "days": "27",
  "destination": "Voluptatem consequat",
  "adults": "23",
  "children": "0",
  "hotelPreference": "4 Star",
  "transportPreference": "",
  "budget": "44",
  "notes": "Magni sunt aspernatu",
  "mealPlan": "MAP",
  "hotelCategory": "",
  "departureCity": "Id qui quod est odio",
  "tripType": "Group",
  "rooms": "38",
  "childAges": [],
  "sightseeingVehicle": "Sedan",
  "ticketHelp": [
    "Train"
  ],
  "source": "Public Enquiry Form",
  "agentId": "n6sazo1LqDWInaSkX4C8vI3Yf6v1",
  "assignedAgentId": "n6sazo1LqDWInaSkX4C8vI3Yf6v1",
  "assignedAgentName": "Rushikesh",
  "customerId": "ullknE1As2cnnYhd3abE",
  "adminId": null,
  "createdAt": {
    "_seconds": 1777573874,
    "_nanoseconds": 144000000
  },
  "coldReason": null,
  "coldMarkedAt": null,
  "isCold": false,
  "status": "Closed Won",
  "updatedAt": "2026-05-18T05:34:57.376Z"
}
```

#### Subcollections

##### `followups`

**Sample 1** — ID: `HAiOIJcTSivQduLXT3Tz`

```json
{
  "id": "HAiOIJcTSivQduLXT3Tz",
  "mode": "Call",
  "notes": "Initial follow-up for public enquiry",
  "quotationIds": [],
  "createdAt": {
    "_seconds": 1777573874,
    "_nanoseconds": 208000000
  },
  "quotationNames": [],
  "dateTime": "2026-05-03T17:52",
  "completedAt": "2026-05-03T08:18:53.198Z",
  "completionNotes": "slkad",
  "status": "Completed",
  "updatedAt": {
    "_seconds": 1777796322,
    "_nanoseconds": 531000000
  }
}
```

##### `notes`

**Sample 1** — ID: `IbjQ58ff0NdqkF4oU3i5`

```json
{
  "id": "IbjQ58ff0NdqkF4oU3i5",
  "text": "Status updated to: Quotation Sent",
  "createdBy": "Agent",
  "createdAt": {
    "_seconds": 1779082459,
    "_nanoseconds": 176000000
  }
}
```

**Sample 2** — ID: `TtPtjXmZzle629yU8Lyx`

```json
{
  "id": "TtPtjXmZzle629yU8Lyx",
  "text": "Status updated to: Quotation Sent",
  "createdBy": "Agent",
  "createdAt": {
    "_seconds": 1779082464,
    "_nanoseconds": 943000000
  }
}
```

### Sample Document 2 — ID: `9Few9gdkDh1OxSKeTm5l`

```json
{
  "id": "9Few9gdkDh1OxSKeTm5l",
  "name": "Xander Rhodes",
  "email": "niravuqe@mailinator.com",
  "mobile": "",
  "travelDate": "1978-11-30",
  "days": "5",
  "destination": "Rerum excepteur et t",
  "adults": "97",
  "children": "0",
  "hotelPreference": "5 Star",
  "transportPreference": "",
  "budget": "92",
  "notes": "Et commodo rem praes",
  "mealPlan": "AP",
  "hotelCategory": "",
  "departureCity": "Ut ut natus veritati",
  "tripType": "Couple",
  "rooms": "87",
  "childAges": [],
  "sightseeingVehicle": "Tempo Traveller",
  "ticketHelp": [
    "Not Required"
  ],
  "source": "Public Enquiry Form",
  "agentId": "n6sazo1LqDWInaSkX4C8vI3Yf6v1",
  "assignedAgentId": "n6sazo1LqDWInaSkX4C8vI3Yf6v1",
  "assignedAgentName": "Rushikesh",
  "customerId": "SjlCihyRzn9fcj6hax9C",
  "adminId": null,
  "status": "New",
  "createdAt": {
    "_seconds": 1777573716,
    "_nanoseconds": 143000000
  }
}
```

#### Subcollections

##### `followups`

**Sample 1** — ID: `0uca8cVEDSOdtk3qBtUw`

```json
{
  "id": "0uca8cVEDSOdtk3qBtUw",
  "mode": "Call",
  "notes": "Initial follow-up for public enquiry",
  "quotationIds": [],
  "status": "Pending",
  "createdAt": {
    "_seconds": 1777573716,
    "_nanoseconds": 209000000
  },
  "quotationNames": [],
  "dateTime": "2026-05-07T16:49",
  "updatedAt": {
    "_seconds": 1777796135,
    "_nanoseconds": 860000000
  }
}
```


## 📁 `locations`

---

### Sample Document 1 — ID: `andhra_pradesh`

```json
{
  "id": "andhra_pradesh",
  "name": "Andhra Pradesh",
  "cities": [
    {
      "hotelIds": [
        "F87AZMCO8j3LF9LSsRQZ",
        "a7RFAj2xQIosUdJhcB4j",
        "WWYNYiQ8WGsbPTXF58ee",
        "NCuf0ZeNtnQj6RLNzG6f"
      ],
      "name": "visakhapatnam",
      "activityIds": [
        "hnTazYIQIViMQkVAPGLg"
      ]
    }
  ]
}
```

### Sample Document 2 — ID: `arunachal_pradesh`

```json
{
  "id": "arunachal_pradesh",
  "name": "Arunachal Pradesh",
  "cities": [
    {
      "name": "Kaziranga",
      "activityIds": [
        "IAKLxY3jzNUur5m7sUBc"
      ]
    }
  ]
}
```


## 📁 `meta`

---

### Sample Document 1 — ID: `quotationCounter`

```json
{
  "id": "quotationCounter",
  "count": 17,
  "lastReset": "2605",
  "updatedAt": {
    "_seconds": 1779092938,
    "_nanoseconds": 625000000
  }
}
```


## 📁 `notifications`

---

### Sample Document 1 — ID: `1Vmef29Ql9c7vjEJTUfs`

```json
{
  "id": "1Vmef29Ql9c7vjEJTUfs",
  "userId": "n6sazo1LqDWInaSkX4C8vI3Yf6v1",
  "type": "quotation_accepted",
  "title": "Quotation accepted! 🎉",
  "message": "Amir test accepted the quotation for test.",
  "link": "/agent-panel/my-quatation?quoteId=DB439uX1A81HOfnVShcZ",
  "metadata": {},
  "priority": "high",
  "createdAt": {
    "_seconds": 1777833864,
    "_nanoseconds": 470000000
  },
  "read": true
}
```

### Sample Document 2 — ID: `2KrgqqZP7CY9llpBFdr6`

```json
{
  "id": "2KrgqqZP7CY9llpBFdr6",
  "userId": "n6sazo1LqDWInaSkX4C8vI3Yf6v1",
  "type": "quotation_sent",
  "title": "Quotation sent",
  "message": "Quotation for Amir test has been marked as sent.",
  "link": "/agent-panel/my-quatation?quoteId=iuAWFZz9qFE5EW6TMlf2",
  "metadata": {},
  "priority": "normal",
  "createdAt": {
    "_seconds": 1777833630,
    "_nanoseconds": 403000000
  },
  "read": true
}
```


## 📁 `packages`

---

### Sample Document 1 — ID: `agent1@gmail.com`

```json
{
  "id": "agent1@gmail.com",
  "packages": [
    {
      "hotel": {
        "id": "w417B8NSw1SMmYIOJQCA",
        "state": "Himachal Pradesh",
        "rooms": [
          {
            "seasons": [
              {
                "name": "Off Season 1",
                "start": "2025-01-02",
                "end": "2025-04-15",
                "pricing": {
                  "cp": {
                    "extraChild": 400,
                    "double": 1500,
                    "extraAdult": 400
                  },
                  "ap": {
                    "extraChild": 0,
                    "double": 0,
                    "extraAdult": 0
                  },
                  "ep": {
                    "extraChild": 300,
                    "double": 1200,
                    "extraAdult": 300
                  },
                  "map": {
                    "extraChild": 600,
                    "double": 1800,
                    "extraAdult": 600
                  }
                }
              },
              {
                "start": "2025-07-05",
                "pricing": {
                  "ep": {
                    "extraAdult": 300,
                    "double": 1200,
                    "extraChild": 300
                  },
                  "map": {
                    "extraChild": 600,
                    "extraAdult": 600,
                    "double": 1800
                  },
                  "cp": {
                    "double": 1500,
                    "extraAdult": 400,
                    "extraChild": 400
                  },
                  "ap": {
                    "extraAdult": 0,
                    "extraChild": 0,
                    "double": 0
                  }
                },
                "name": "Off Season 2",
                "end": "2025-12-19"
              },
              {
                "start": "2025-04-15",
                "end": "2025-07-05",
                "name": "Season 1",
                "pricing": {
                  "ep": {
                    "double": 2000,
                    "extraChild": 400,
                    "extraAdult": 400
                  },
                  "ap": {
                    "extraAdult": 0,
                    "extraChild": 0,
                    "double": 0
                  },
                  "cp": {
                    "extraAdult": 600,
                    "double": 2500,
                    "extraChild": 600
                  },
                  "map": {
                    "extraChild": 900,
                    "extraAdult": 900,
                    "double": 3000
                  }
                }
              },
              {
                "pricing": {
                  "map": {
                    "double": 3000,
                    "extraChild": 900,
                    "extraAdult": 900
                  },
                  "ap": {
                    "extraAdult": 0,
                    "extraChild": 0,
                    "double": 0
                  },
                  "cp": {
                    "extraChild": 600,
                    "extraAdult": 600,
                    "double": 2500
                  },
                  "ep": {
                    "double": 2000,
                    "extraChild": 400,
                    "extraAdult": 400
                  }
                },
                "end": "2026-01-02",
                "name": "Season 2",
                "start": "2025-12-20"
              }
            ],
            "categoryName": "Deluxe Room"
          },
          {
            "categoryName": "Super Deluxe Rooms",
            "seasons": [
              {
                "name": "Off Season 1",
                "start": "2025-01-02",
                "pricing": {
                  "map": {
                    "extraChild": 600,
                    "extraAdult": 600,
                    "double": 2100
                  },
                  "cp": {
                    "extraAdult": 400,
                    "double": 1800,
                    "extraChild": 400
                  },
                  "ap": {
                    "extraAdult": 0,
                    "double": 0,
                    "extraChild": 0
                  },
                  "ep": {
                    "extraAdult": 300,
                    "extraChild": 300,
                    "double": 1500
                  }
                },
                "end": "2025-04-15"
              },
              {
                "end": "2025-12-19",
                "start": "2025-07-05",
                "pricing": {
                  "ap": {
                    "extraAdult": 0,
                    "double": 0,
                    "extraChild": 0
                  },
                  "cp": {
                    "extraChild": 400,
                    "extraAdult": 400,
                    "double": 1800
                  },
                  "map": {
                    "double": 2100,
                    "extraChild": 300,
                    "extraAdult": 300
                  },
                  "ep": {
                    "extraChild": 300,
                    "extraAdult": 300,
                    "double": 1500
                  }
                },
                "name": "Off Season 2"
              },
              {
                "start": "2025-04-15",
                "pricing": {
                  "map": {
                    "extraChild": 900,
                    "double": 3500,
                    "extraAdult": 900
                  },
                  "cp": {
                    "extraChild": 900,
                    "extraAdult": 600,
                    "double": 3000
                  },
                  "ep": {
                    "extraChild": 400,
                    "extraAdult": 400,
                    "double": 2500
                  },
                  "ap": {
                    "double": 0,
                    "extraChild": 0,
                    "extraAdult": 0
                  }
                },
                "end": "2025-07-05",
                "name": "Season 1"
              },
              {
                "pricing": {
                  "ep": {
                    "double": 2500,
                    "extraChild": 400,
                    "extraAdult": 400
                  },
                  "cp": {
                    "extraChild": 600,
                    "extraAdult": 600,
                    "double": 3000
                  },
                  "ap": {
                    "extraChild": 0,
                    "double": 0,
                    "extraAdult": 0
                  },
                  "map": {
                    "double": 3500,
                    "extraAdult": 900,
                    "extraChild": 900
                  }
                },
                "start": "2025-12-20",
                "name": "Season 2",
                "end": "2026-01-02"
              }
            ]
          },
          {
            "seasons": [
              {
                "start": "2025-01-02",
                "pricing": {
                  "map": {
                    "double": 3200,
                    "extraAdult": 600,
                    "extraChild": 600
                  },
                  "ep": {
                    "double": 2000,
                    "extraAdult": 300,
                    "extraChild": 300
                  },
                  "ap": {
                    "extraChild": 0,
                    "extraAdult": 0,
                    "double": 0
                  },
                  "cp": {
                    "extraChild": 400,
                    "double": 2600,
                    "extraAdult": 400
                  }
                },
                "name": "Off Season 1",
                "end": "2025-04-15"
              },
              {
                "pricing": {
                  "ep": {
                    "double": 2000,
                    "extraChild": 300,
                    "extraAdult": 300
                  },
                  "map": {
                    "double": 3200,
                    "extraAdult": 600,
                    "extraChild": 600
                  },
                  "ap": {
                    "extraAdult": 0,
                    "double": 0,
                    "extraChild": 0
                  },
                  "cp": {
                    "extraChild": 400,
                    "double": 2600,
                    "extraAdult": 400
                  }
                },
                "start": "2025-07-02",
                "end": "2025-12-19",
                "name": "Off Season 2"
              },
              {
                "pricing": {
                  "ap": {
                    "double": 0,
                    "extraChild": 0,
                    "extraAdult": 0
                  },
                  "cp": {
                    "double": 4200,
                    "extraAdult": 600,
                    "extraChild": 600
                  },
                  "map": {
                    "extraChild": 900,
                    "double": 5200,
                    "extraAdult": 900
                  },
                  "ep": {
                    "extraAdult": 400,
                    "extraChild": 400,
                    "double": 3200
                  }
                },
                "end": "2025-07-05",
                "start": "2025-04-15",
                "name": "Season 1"
              },
              {
                "pricing": {
                  "ep": {
                    "extraAdult": 400,
                    "double": 3200,
                    "extraChild": 400
                  },
                  "cp": {
                    "double": 4200,
                    "extraAdult": 600,
                    "extraChild": 600
                  },
                  "map": {
                    "double": 5200,
                    "extraAdult": 900,
                    "extraChild": 900
                  },
                  "ap": {
                    "extraAdult": 0,
                    "double": 0,
                    "extraChild": 0
                  }
                },
                "start": "2025-12-20",
                "end": "2026-01-02",
                "name": "Season 2"
              }
            ],
            "categoryName": "Family Room"
          },
          {
            "categoryName": "Family Suite",
            "seasons": [
              {
                "name": "Off Season 1",
                "pricing": {
                  "ep": {
                    "extraChild": 300,
                    "double": 2200,
                    "extraAdult": 300
                  },
                  "map": {
                    "extraChild": 600,
                    "double": 3400,
                    "extraAdult": 600
                  },
                  "ap": {
                    "extraChild": 0,
                    "double": 0,
                    "extraAdult": 0
                  },
                  "cp": {
                    "extraChild": 400,
                    "double": 2800,
                    "extraAdult": 400
                  }
                },
                "start": "2025-01-02",
                "end": "2025-04-15"
              },
              {
                "pricing": {
                  "cp": {
                    "extraChild": 400,
                    "extraAdult": 400,
                    "double": 2800
                  },
                  "ap": {
                    "double": 0,
                    "extraChild": 0,
                    "extraAdult": 0
                  },
                  "ep": {
                    "extraChild": 300,
                    "double": 2200,
                    "extraAdult": 300
                  },
                  "map": {
                    "extraChild": 600,
                    "double": 3400,
                    "extraAdult": 600
                  }
                },
                "name": "Off Season 2",
                "end": "2025-12-19",
                "start": "2025-07-05"
              },
              {
                "name": "Season 1",
                "end": "2025-07-05",
                "start": "2025-04-15",
                "pricing": {
                  "cp": {
                    "extraAdult": 600,
                    "extraChild": 600,
                    "double": 4500
                  },
                  "ap": {
                    "double": 0,
                    "extraChild": 0,
                    "extraAdult": 0
                  },
                  "ep": {
                    "extraAdult": 400,
                    "double": 3500,
                    "extraChild": 400
                  },
                  "map": {
                    "extraChild": 900,
                    "double": 5500,
                    "extraAdult": 900
                  }
                }
              },
              {
                "pricing": {
                  "cp": {
                    "extraChild": 600,
                    "double": 4500,
                    "extraAdult": 600
                  },
                  "ap": {
                    "double": 0,
                    "extraAdult": 0,
                    "extraChild": 0
                  },
                  "map": {
                    "double": 5500,
                    "extraAdult": 900,
                    "extraChild": 900
                  },
                  "ep": {
                    "extraAdult": 400,
                    "extraChild": 400,
                    "double": 3500
                  }
                },
                "name": "Season 2",
                "end": "2026-01-02",
                "start": "2025-12-20"
              }
            ]
          }
        ],
        "city": "Manali",
        "name": "Hotel Devlok By DLS Hotels",
        "rating": "3-star"
      },
      "checkInDate": "2025-05-30",
      "nights": 1,
      "checkOutDate": "2025-05-31",
      "numDouble": [
        0
      ],
      "numExtraAdult": [
        2
      ],
      "numExtraChild": [
        0
      ],
      "hotelTotal": [
        1200
      ],
      "selectedMealPlan": "CP",
      "applicableSeason": {
        "start": "2025-04-15",
        "end": "2025-07-05",
        "name": "Season 1",
        "pricing": {
          "ep": {
            "double": 2000,
            "extraChild": 400,
            "extraAdult": 400
          },
          "ap": {
            "extraAdult": 0,
            "extraChild": 0,
            "double": 0
          },
          "cp": {
            "extraAdult": 600,
            "double": 2500,
            "extraChild": 600
          },
          "map": {
            "extraChild": 900,
            "extraAdult": 900,
            "double": 3000
          }
        }
      }
    }
  ],
  "updatedAt": "2025-05-30T08:57:56.942Z"
}
```


## 📁 `pushSubscriptions`

---

### Sample Document 1 — ID: `EWqrZ9zWb74qrZxIYYRqDJ1E8i17vqWd`

```json
{
  "id": "EWqrZ9zWb74qrZxIYYRqDJ1E8i17vqWd",
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/fwIApuhwMA8:APA91bE-tSulBQ_t701ylBhiBEUvDCMBaceZ_CmZcg1sfA3TebiuzRXGGcvhZGfigV9MqbnJz8owTA0jgq7ihAvt1dLFv9BceaJAXe5TEDxOEWqrZ9zWb74qrZxIYYRqDJ1E8i17vqWd",
    "expirationTime": null,
    "keys": {
      "auth": "MtDvA36Ju6smmHSAUnpW7Q",
      "p256dh": "BC9DTVXuQPNC8TKQHye_ITVTFypIBXloY_DHDlbf2bA0ILmBgAXQ6_Q5ppXs-XPyW9DPqpiztkGDB4ZOYSQiK5M"
    }
  },
  "userId": "n6sazo1LqDWInaSkX4C8vI3Yf6v1",
  "createdAt": {
    "_seconds": 1777753034,
    "_nanoseconds": 249000000
  }
}
```

### Sample Document 2 — ID: `HnIjmF91Od4GWmc6oun7xVuXQtuHK43l`

```json
{
  "id": "HnIjmF91Od4GWmc6oun7xVuXQtuHK43l",
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/c4CUGIrO5b8:APA91bEqVozT3UkpMl_QX0kNKQxTNjbcX9j8W9ije_PBNP3Gq034AvYjBNdwIfb0bqJPAxl3ywAebt-PDsvOmnAtJjL49h1Hgyky_tCrEK-hHnIjmF91Od4GWmc6oun7xVuXQtuHK43l",
    "expirationTime": null,
    "keys": {
      "auth": "KM9A0XFYrHg5uSgBJSNl_Q",
      "p256dh": "BMG0tYZ_4iOSrdwYsULD2mZYv1iaJKNd-ZGMt8DfIcUZxMNWUaUTP3rA4JepriTpfGN5h3Lr9Ui9k6AnGxY01dg"
    }
  },
  "userId": "n6sazo1LqDWInaSkX4C8vI3Yf6v1",
  "createdAt": {
    "_seconds": 1777740936,
    "_nanoseconds": 51000000
  }
}
```


## 📁 `saved_packages_by_agents`

---

_No documents found_

## 📁 `submissions`

---

### Sample Document 1 — ID: `0aDOK5f1c0jKxjxqJHEt`

```json
{
  "id": "0aDOK5f1c0jKxjxqJHEt",
  "name": "Abhishek kardile ",
  "age": "19",
  "gender": "Male",
  "preference": "Middle",
  "address": "Chhatrapati sambhajinagar ",
  "mobile": "7028628194",
  "email": "abhishekkardile78@gmail.com",
  "tripId": "Ywp8PEZC3cGaXrRZB4TM",
  "tripName": "MGM-09/04/2026",
  "agentId": "BtYbknb4isOKZLxUAWZpIZUGu652",
  "submittedAt": {
    "_seconds": 1773071786,
    "_nanoseconds": 23000000
  },
  "updatedAt": {
    "_seconds": 1773071786,
    "_nanoseconds": 23000000
  }
}
```

### Sample Document 2 — ID: `3AkFRBpXy6RpmV6EDw09`

```json
{
  "id": "3AkFRBpXy6RpmV6EDw09",
  "name": "Om Rameshwar Salve",
  "age": "19",
  "gender": "Male",
  "preference": "Upper",
  "address": "Tembhurni Tq. Jafrabad Dist. Jalna",
  "mobile": "7498900391",
  "email": "omsalve200@gmail.com",
  "tripId": "Ywp8PEZC3cGaXrRZB4TM",
  "tripName": "MGM-09/04/2026",
  "agentId": "BtYbknb4isOKZLxUAWZpIZUGu652",
  "submittedAt": {
    "_seconds": 1773042754,
    "_nanoseconds": 444000000
  },
  "updatedAt": {
    "_seconds": 1773042754,
    "_nanoseconds": 444000000
  }
}
```


## 📁 `super_admins`

---

### Sample Document 1 — ID: `MhEmHnEYcaXHSxxNzhWbO20SZBI2`

```json
{
  "id": "MhEmHnEYcaXHSxxNzhWbO20SZBI2",
  "approved": true,
  "email": "admin@gmail.com",
  "name": "Superadmin",
  "phone": "+910000000000",
  "role": "superadmin",
  "uid": "MhEmHnEYcaXHSxxNzhWbO20SZBI2"
}
```


## 📁 `transport`

---

### Sample Document 1 — ID: `andaman-and-nicobar-islands`

```json
{
  "id": "andaman-and-nicobar-islands",
  "stateName": "andaman-and-nicobar-islands",
  "pricing": {
    "lumpsum": [],
    "perKm": []
  },
  "packages": []
}
```

### Sample Document 2 — ID: `andhra-pradesh`

```json
{
  "id": "andhra-pradesh",
  "stateName": "andhra-pradesh\n",
  "pricing": {
    "lumpsum": [],
    "perKm": []
  },
  "packages": []
}
```


## 📁 `trips`

---

### Sample Document 1 — ID: `BYs37adviJ52gCgqgHLu`

```json
{
  "id": "BYs37adviJ52gCgqgHLu",
  "tripName": "demo",
  "journeys": [
    {
      "id": "1179630c-0873-412f-9431-ff98e04a1a0d",
      "trainNo": "12345",
      "trainName": "Kerala ec",
      "date": "2026-04-04",
      "class": "SL",
      "seats": "55",
      "from": "ned",
      "to": "sbc"
    }
  ],
  "status": "public",
  "agentId": "BtYbknb4isOKZLxUAWZpIZUGu652",
  "createdAt": {
    "_seconds": 1774808251,
    "_nanoseconds": 267000000
  },
  "updatedAt": {
    "_seconds": 1774808251,
    "_nanoseconds": 267000000
  }
}
```

### Sample Document 2 — ID: `OSAzN1jNvlqkdcyEidnU`

```json
{
  "id": "OSAzN1jNvlqkdcyEidnU",
  "agentId": "A1X1gWdU1rWiUW5ZYtmescnu8vH3",
  "createdAt": {
    "_seconds": 1772112457,
    "_nanoseconds": 566000000
  },
  "tripName": "test trip demo",
  "status": "public",
  "journeys": [
    {
      "from": "AWB",
      "seats": "14",
      "trainName": "demo express",
      "trainNo": "212454",
      "class": "SL",
      "to": "sbc",
      "date": "2026-02-27",
      "id": "66f44c92-21a9-4700-965a-142fee440c03"
    },
    {
      "id": "a1d881e0-80a8-477b-acac-a3378a0acd0d",
      "date": "2026-02-27",
      "class": "SL",
      "to": "SBC",
      "trainNo": "212545",
      "trainName": "Kerla express",
      "from": "NDLS",
      "seats": "14"
    },
    {
      "class": "2A",
      "to": "PBN",
      "trainNo": "176112",
      "id": "875360a7-4a31-41a3-be3a-f47953a36ec3",
      "date": "2026-02-28",
      "seats": "14",
      "from": "CPSN",
      "trainName": "Rajya rani exp"
    },
    {
      "seats": "14",
      "from": "NDLS",
      "trainName": "demo express",
      "trainNo": "12454",
      "class": "SL",
      "to": "SBC",
      "date": "2026-03-17",
      "id": "957ce93b-bd18-4720-8ff6-bf169b7d3d71"
    }
  ],
  "updatedAt": {
    "_seconds": 1773053223,
    "_nanoseconds": 971000000
  }
}
```


## 📁 `users`

---

### Sample Document 1 — ID: `n6sazo1LqDWInaSkX4C8vI3Yf6v1`

```json
{
  "id": "n6sazo1LqDWInaSkX4C8vI3Yf6v1",
  "platform": "windows",
  "fcmTokens": [
    "cTgMDFTdeFuVbK1lo5RR6J:APA91bHEL5gHtUeKTlil0F6yA3SqOzGjHmKWxbJ7ymNK-XpCZUmVMbB2mJxrFI80sdt1SP3qnQtEiUhXlauswxDpb1wVaWoKshosZ4IpUTFd71hrh4TmssQ",
    "dB1aox9ZCZCD6teJY1cCSr:APA91bEPhFLx3kjDn4l9MmpE5pCkf_CqDtasbVti3llKPXI_FVuAVXVVg2QAxKmCbFagn2vYh0oWJzyIIh_CbzYp2RQohmnTh-WjRbTtGCKYkGTrBXbhKfg"
  ],
  "lastSeen": {
    "_seconds": 1777700039,
    "_nanoseconds": 240000000
  }
}
```


