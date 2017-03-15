module.exports = {
  barracks: {
  	baseURL: process.env.BARRACKS_BASE_URL,
    apiKey: process.env.BARRACKS_API_KEY,
    unitId: process.env.BARRACKS_UNIT_ID
  },
  pingInterval: process.env.PING_INTERVAL || 5000
};