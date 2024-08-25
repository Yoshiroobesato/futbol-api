const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const NodeCache = require('node-cache');
const winston = require('winston');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const port = process.env.PORT || 8083;
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'video-info-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Video Info API',
      version: '1.0.0',
      description: 'API for extracting video information',
    },
  },
  apis: ['./server.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Extract video info function
async function extractVideoInfo(url) {
  const cachedData = cache.get(url);
  if (cachedData) return cachedData;

  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    const $ = cheerio.load(response.data);

    const videoInfo = {
      title: $('div.data-video__title h1').text().trim() || 'video',
      videoUrl: $('source').attr('src') || null,
      posterUrl: $('#video-poster').attr('src') || null,
      views: parseInt($('#n-views').text().trim().replace(/,/g, '') || '0', 10),
      likes: parseInt($('#n-likes-video').text().trim().replace(/,/g, '') || '0', 10),
      dislikes: parseInt($('#n-dislikes-video').text().trim().replace(/,/g, '') || '0', 10)
    };

    cache.set(url, videoInfo);
    return videoInfo;
  } catch (error) {
    logger.error(`Error extracting video info: ${error.message}`, { url });
    throw new Error('Could not extract video information');
  }
}

// URL validation middleware
function validateUrl(req, res, next) {
  const userUrl = req.query.url;
  if (!userUrl) {
    return res.status(400).json({ success: false, error: 'Please provide a valid URL.' });
  }
  try {
    new URL(userUrl);
    next();
  } catch (error) {
    res.status(400).json({ success: false, error: 'The provided URL is not valid.' });
  }
}

/**
 * @swagger
 * /info:
 *   get:
 *     summary: Get video information
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
app.get('/info', validateUrl, async (req, res) => {
  try {
    const videoInfo = await extractVideoInfo(req.query.url);
    res.status(200).json({ success: true, data: videoInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /download:
 *   get:
 *     summary: Get download link for video or poster
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [video, poster]
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
app.get('/download', validateUrl, async (req, res) => {
  try {
    const videoInfo = await extractVideoInfo(req.query.url);
    const fileType = req.query.type;

    if (fileType === 'video' && videoInfo.videoUrl) {
      res.json({ success: true, downloadUrl: videoInfo.videoUrl });
    } else if (fileType === 'poster' && videoInfo.posterUrl) {
      res.json({ success: true, downloadUrl: videoInfo.posterUrl });
    } else {
      res.status(400).json({ success: false, error: 'Invalid file type or link not found. Use "video" or "poster".' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Global error handling
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// Handle not found routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// Start server
app.listen(port, () => {
  logger.info(`Server started on http://localhost:${port}`);
});