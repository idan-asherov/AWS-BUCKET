const form = document.getElementById("uploadForm");
const statusDiv = document.getElementById("statusMessage");
const submitBtn = document.getElementById("submitBtn");
const galleryDiv = document.getElementById("gallery");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusDiv.style.display = "none";
  statusDiv.className = "";
  submitBtn.disabled = true;
  submitBtn.innerText = "Uploading...";

  const formData = new FormData();
  formData.append("description", document.getElementById("description").value);
  formData.append("image", document.getElementById("imageFile").files[0]);

  try {
    const response = await fetch("/upload", { method: "POST", body: formData });
    const result = await response.json();
    statusDiv.style.display = "block";

    if (response.ok && result.success) {
      statusDiv.className = "success";
      statusDiv.innerText = result.message || "Success!";
      form.reset();
      loadGallery();
    } else {
      statusDiv.className = "error";
      statusDiv.innerText = result.message || "Upload failed.";
    }
  } catch (err) {
    console.error(err);
    statusDiv.style.display = "block";
    statusDiv.className = "error";
    statusDiv.innerText = "Network Error.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Upload to S3";
  }
});

// Load and render live posts gallery from S3 list
async function loadGallery() {
  try {
    const response = await fetch("/posts");
    const result = await response.json();

    if (result.success) {
      galleryDiv.innerHTML = "";

      if (!result.posts || result.posts.length === 0) {
        galleryDiv.innerHTML =
          '<p style="text-align:center; color:#777;">No images found in your S3 bucket.</p>';
        return;
      }

      result.posts.forEach((post) => {
        const postCard = document.createElement("div");
        postCard.style.background = "#fafafa";
        postCard.style.padding = "15px";
        postCard.style.borderRadius = "8px";
        postCard.style.border = "1px solid #eaeaea";
        postCard.style.marginBottom = "15px";

        postCard.innerHTML = `
          <img src="${post.imageUrl}" alt="S3 Asset" style="width:100%; max-height:250px; object-fit:cover; border-radius:6px; margin-bottom:10px;">
          <strong style="color:#333; display:block; font-size:12px; word-break:break-all;">S3 File Key Name:</strong>
          <p style="margin:4px 0 12px 0; color:#666; font-family:monospace; font-size:11px; word-break:break-all;">${post.unique}</p>
          <button class="delete-btn" data-key="${post.unique}" style="background-color: #c5221f; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Delete Asset</button>
        `;
        galleryDiv.appendChild(postCard);
      });

      // Bind delete click actions
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", async (e) => {
          const s3Key = e.target.getAttribute("data-key");
          if (
            confirm(
              `Are you sure you want to permanently delete "${s3Key}" from S3?`,
            )
          ) {
            await deletePost(s3Key);
          }
        });
      });
    }
  } catch (err) {
    console.error("Gallery loading error:", err);
  }
}

async function deletePost(key) {
  try {
    const response = await fetch(`/posts/${encodeURIComponent(key)}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (result.success) {
      alert("Purged successfully from S3!");
      loadGallery();
    } else {
      alert("Error deleting: " + result.message);
    }
  } catch (error) {
    console.error(error);
    alert("Network error processing deletion.");
  }
}

// Initial pull on page mount
loadGallery();
