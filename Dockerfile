FROM node:22
EXPOSE 3000
RUN mkdir /app
RUN cd /app
WORKDIR /app
RUN npm init -y
RUN npm i grammy
RUN npm i dotenv
RUN npm i nodemon
COPY . .
CMD ["npm", "start"]