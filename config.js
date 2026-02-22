// config.js

const DEFAULT_CONFIG = {
    baseStartHourUTC: 4, // Grid starts at 4 AM UTC
    cities: [
        { id: "sf", name: "San Francisco", timezone: "America/Los_Angeles", tzStd: "PST", tzDst: "PDT", lat: 37.77, lon: -122.41, workStart: 9, workEnd: 18, visible: true },
        { id: "la", name: "Los Angeles", timezone: "America/Los_Angeles", tzStd: "PST", tzDst: "PDT", lat: 34.05, lon: -118.24, workStart: 9, workEnd: 18, visible: false },
        { id: "austin", name: "Austin", timezone: "America/Chicago", tzStd: "CST", tzDst: "CDT", lat: 30.26, lon: -97.74, workStart: 9, workEnd: 18, visible: true },
        { id: "chi", name: "Chicago", timezone: "America/Chicago", tzStd: "CST", tzDst: "CDT", lat: 41.85, lon: -87.65, workStart: 9, workEnd: 18, visible: false },
        { id: "sp", name: "Sao Paulo", timezone: "America/Sao_Paulo", tzStd: "BRT", tzDst: "BRST", lat: -23.55, lon: -46.63, workStart: 9, workEnd: 18, visible: true },
        { id: "lon", name: "London", timezone: "Europe/London", tzStd: "GMT", tzDst: "BST", lat: 51.51, lon: -0.13, workStart: 9, workEnd: 18, visible: false },
        { id: "ams", name: "Amsterdam", timezone: "Europe/Amsterdam", tzStd: "CET", tzDst: "CEST", lat: 52.36, lon: 4.90, workStart: 9, workEnd: 18, visible: true },
        { id: "bcn", name: "Barcelona", timezone: "Europe/Madrid", tzStd: "CET", tzDst: "CEST", lat: 41.38, lon: 2.16, workStart: 9, workEnd: 18, visible: true },
        { id: "lim", name: "Limassol", timezone: "Asia/Nicosia", tzStd: "EET", tzDst: "EEST", lat: 34.68, lon: 33.04, workStart: 9, workEnd: 18, visible: false },
        { id: "spb", name: "St Petersburg", timezone: "Europe/Moscow", tzStd: "MSK", tzDst: "MSK", lat: 59.93, lon: 30.36, workStart: 9, workEnd: 18, visible: false },
        { id: "yer", name: "Yerevan", timezone: "Asia/Yerevan", tzStd: "AMT", tzDst: "AMST", lat: 40.18, lon: 44.51, workStart: 9, workEnd: 18, visible: true }
    ]
};
