# ========================================================
# שלב 1: שלב הבנייה והתקנת התלויות (Build Stage)
# ========================================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# העתקת קבצי המקור מהשורש
COPY public/ ./public/
COPY app.js ./

# ========================================================
# שלב 2: שלב הריצה הנקי והמאובטח (Production Stage)!!!!
# ========================================================
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/app.js ./app.js
COPY package.json ./

EXPOSE 3000
USER node

CMD ["npm", "start"]