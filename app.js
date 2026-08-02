require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------------------------------------------
// AWS S3 CLIENT (DEVOPS PRODUCTION SETUP)
// -------------------------------------------------------------
const AWS_REGION = process.env.AWS_REGION || "eu-north-1";
const BUCKET = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME;

if (!BUCKET) {
  console.warn(
    "⚠️ Warning: S3_BUCKET or S3_BUCKET_NAME is not defined in environment variables!",
  );
}

const s3 = new S3Client({ region: AWS_REGION });
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// הגשת קבצים סטטיים מתיקיית public בצורה בטוחה
app.use(express.static(path.join(__dirname, "public")));

// -------------------------------------------------------------
// MANDATORY HEALTH CHECK & ROOT ROUTES (ALB COMPATIBLE)
// -------------------------------------------------------------

// נתיב לבדיקת תקינות ייעודי עבור ה-Load Balancer
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", version: "2.0" });
});

// הנתיב הראשי מגיש בבטחה את ה-Frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -------------------------------------------------------------
// UPLOAD ROUTE
// -------------------------------------------------------------
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No image file provided.", success: false });
    }
    const unique = randomUUID() + "_" + req.file.originalname;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: unique,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }),
    );

    res
      .status(201)
      .json({ message: "Image uploaded successfully!", success: true });
  } catch (error) {
    console.error("S3 Upload Error:", error);
    res.status(500).json({ message: "Failed to upload image", success: false });
  }
});

// -------------------------------------------------------------
// FETCH IMAGES / POSTS ROUTES
// -------------------------------------------------------------
const handleFetchImages = async (req, res) => {
  try {
    const listCommand = new ListObjectsV2Command({ Bucket: BUCKET });
    const s3Response = await s3.send(listCommand);

    if (!s3Response.Contents || s3Response.Contents.length === 0) {
      return res.status(200).json({ success: true, posts: [], images: [] });
    }

    const postsWithUrls = await Promise.all(
      s3Response.Contents.map(async (item) => {
        const getCommand = new GetObjectCommand({
          Bucket: BUCKET,
          Key: item.Key,
        });

        const signedUrl = await getSignedUrl(s3, getCommand, {
          expiresIn: 3600,
        });

        return {
          key: item.Key,
          unique: item.Key,
          size: item.Size,
          lastModified: item.LastModified,
          description: "Stored in S3",
          imageUrl: signedUrl,
          url: signedUrl,
        };
      }),
    );

    res.status(200).json({
      success: true,
      posts: postsWithUrls,
      images: postsWithUrls,
    });
  } catch (error) {
    console.error("Error listing files from S3:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch cloud records" });
  }
};

app.get("/posts", handleFetchImages);
app.get("/images", handleFetchImages);

// -------------------------------------------------------------
// DELETE ROUTES
// -------------------------------------------------------------
const handleDeleteImage = async (req, res) => {
  try {
    const rawKey = req.params.key || req.params[0];
    if (!rawKey) {
      return res
        .status(400)
        .json({ success: false, message: "No key provided" });
    }

    const s3Key = decodeURIComponent(rawKey);

    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
      }),
    );

    res
      .status(200)
      .json({ message: "Item purged from S3 storage!", success: true });
  } catch (error) {
    console.error("S3 Deletion Error:", error);
    res
      .status(500)
      .json({ message: "Failed to remove asset from cloud.", success: false });
  }
};

app.delete("/posts/:key", handleDeleteImage);
app.delete("/images/:key", handleDeleteImage);

// -------------------------------------------------------------
// SERVER LISTENER
// -------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
