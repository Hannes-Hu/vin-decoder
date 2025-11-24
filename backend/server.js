const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'VIN Decoder API is running!' });
});

// VIN decoding endpoint
app.get('/api/decode-vin/:vin', async (req, res) => {
  const { vin } = req.params;

  // Basic VIN validation
  if (!vin || vin.length !== 17) {
    return res.status(400).json({
      error: 'Invalid VIN',
      message: 'VIN must be exactly 17 characters long'
    });
  }

  // VIN format validation (alphanumeric only)
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) {
    return res.status(400).json({
      error: 'Invalid VIN format',
      message: 'VIN contains invalid characters. Only letters (except I, O, Q) and numbers are allowed.'
    });
  }

  try {
    const nhstaUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`;
    
    const response = await fetch(nhstaUrl);
    
    if (!response.ok) {
      throw new Error(`NHTSA API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if VIN was found
    if (!data.Results || data.Results.length === 0) {
      return res.status(404).json({
        error: 'VIN not found',
        message: 'No vehicle data found for this VIN'
      });
    }

    // Extract and format the most useful information
    const formattedData = formatVinData(data.Results, vin);
    
    res.json({
      success: true,
      vin: vin,
      ...formattedData
    });

  } catch (error) {
    console.error('VIN Decoding Error:', error);
    
    res.status(500).json({
      error: 'Failed to decode VIN',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// Helper function to format the NHTSA response
function formatVinData(results, vin) {
  const findVariable = (variableName) => {
    const result = results.find(item => item.Variable === variableName);
    return result && result.Value !== null && result.Value !== '' ? result.Value : 'Not specified';
  };

  return {
    basicInfo: {
      make: findVariable('Make'),
      model: findVariable('Model'),
      modelYear: findVariable('Model Year'),
      manufacturer: findVariable('Manufacturer'),
      plantCountry: findVariable('Plant Country'),
      vehicleType: findVariable('Vehicle Type'),
    },
    specifications: {
      bodyClass: findVariable('Body Class'),
      doors: findVariable('Doors'),
      driveType: findVariable('Drive Type'),
      engineConfiguration: findVariable('Engine Configuration'),
      engineCylinders: findVariable('Engine Number of Cylinders'),
      engineHP: findVariable('Engine HP'),
      engineModel: findVariable('Engine Model'),
      fuelType: findVariable('Fuel Type - Primary'),
      transmissionStyle: findVariable('Transmission Style'),
      trim: findVariable('Trim'),
    },
    safety: {
      restraintType: findVariable('Restraint Type'),
      safetySystems: findVariable('Safety Systems'),
    },
    additionalInfo: {
      series: findVariable('Series'),
      errorCode: findVariable('Error Code'),
      possibleValues: findVariable('Possible Values'),
    }
  };
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on our end'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist'
  });
});

const PORT = process.env.PORT || 3000;

// For Netlify deployment
const server = app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`VIN decode endpoint: http://localhost:${PORT}/api/decode-vin/:vin`);
  });
}

// Export for Netlify Functions
module.exports = server;