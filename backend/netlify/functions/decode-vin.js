const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const path = event.path.split('/');
    const vin = path[path.length - 1];

    // Basic validation
    if (!vin || vin.length !== 17) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'VIN must be 17 characters' })
      };
    }

    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        vin: vin,
        basicInfo: {
          make: getVariable(data.Results, 'Make'),
          model: getVariable(data.Results, 'Model'),
          modelYear: getVariable(data.Results, 'Model Year'),
          manufacturer: getVariable(data.Results, 'Manufacturer')
        },
        specifications: {
          bodyClass: getVariable(data.Results, 'Body Class'),
          fuelType: getVariable(data.Results, 'Fuel Type - Primary'),
          engineCylinders: getVariable(data.Results, 'Engine Number of Cylinders')
        }
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function getVariable(results, variableName) {
  const item = results.find(r => r.Variable === variableName);
  return item && item.Value ? item.Value : 'Not specified';
}