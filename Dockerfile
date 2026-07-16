# Step 1: Use a lightweight, official Node.js runtime base
FROM node:22-alpine

# Step 2: Set the internal execution directory path inside the container
WORKDIR /usr/src/app

# Step 3: Copy package manifests first to leverage Docker's caching layer
COPY package*.json ./

# Step 4: Clean install only production dependencies
RUN npm ci --only=production

# Step 5: Copy the rest of your application source code assets
COPY . .

# Step 6: Document that our express application uses port 3000
EXPOSE 3000

# Step 7: Define the runtime execution execution command
CMD ["npm", "start"]