require("dotenv").config();
const express = require("express");
const multer = require("multer");
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command, // Added import to look up bucket contents
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("crypto");

const app = express();
const PORT = 3000;

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET;
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static("public"));

// Upload Route
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
    console.log("S3 Upload Error:", error);
    res.status(500).json({ message: "Failed to upload image", success: false });
  }
});

// UPDATED: Fetches the live objects list directly from your S3 Bucket
app.get("/posts", async (req, res) => {
  try {
    // 1. Request list of files from the S3 bucket
    const listCommand = new ListObjectsV2Command({ Bucket: BUCKET });
    const s3Response = await s3.send(listCommand);

    // If the bucket is totally empty, return an empty array
    if (!s3Response.Contents) {
      return res.status(200).json({ success: true, posts: [] });
    }

    // 2. Map over every file in the bucket and generate a temporary signed viewing URL
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
          unique: item.Key, // The filename key
          description: "Stored in S3", // Placeholder since S3 doesn't store our text inputs
          imageUrl: signedUrl,
        };
      }),
    );

    res.status(200).json({ success: true, posts: postsWithUrls });
  } catch (error) {
    console.log("Error listing files from S3:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch cloud records" });
  }
});

// Delete Route
app.delete("/posts/:key", async (req, res) => {
  try {
    const s3Key = req.params.key;

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
    console.log("S3 Deletion Error:", error);
    res
      .status(500)
      .json({ message: "Failed to remove asset from cloud.", success: false });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
