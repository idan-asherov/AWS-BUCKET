# ========================================================
# שלב 1: שלב הבנייה והתקנת התלויות (Build Stage)
# ========================================================
FROM node:22-alpine AS builder

WORKDIR /app

# העתקת מניפסט החבילות
COPY package*.json ./

# התקנת תלויות ייצור בלבד (שומר על אימג' קטן ומאובטח)
RUN npm ci --only=production

# העתקת שאר קובצי הפרויקט
COPY . .

# ========================================================
# שלב 2: שלב הריצה הנקי והמאובטח (Production Stage)
# ========================================================
FROM node:22-alpine AS runner

WORKDIR /app

# העתקת תיקיית node_modules הנקייה משלב ה-builder
COPY --from=builder /app/node_modules ./node_modules

# העתקת קובצי השרת, ה-Frontend ומנשר ה-NPM
COPY . .

# חשיפת הפורט עליו רץ השרת
EXPOSE 3000

# הרצה כמשתמש מאובטח שאינו Root
USER node

CMD ["npm", "start"]