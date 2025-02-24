FROM node:22
EXPOSE 3000
RUN mkdir /app
RUN cd /app
WORKDIR /app
RUN npm init -y
RUN npm i grammy
RUN npm i dotenv
COPY . .
CMD ["node", "index.js"]