// Подключение библиотеки, для получения доступа к переменной окружения
require('dotenv').config();

// Импорт классов из библиотеки Grammy
// Класс Bot - главный класс, необходимый для разработки
// Также добавляю классы для работы с обработкой ошибок. GrammyError и HttpError
const {Bot, GrammyError, HttpError} = require('grammy');

// Создаем экземпляр бота. передаем ему название файла и название переменной с ключом
//const bot = new Bot(process.env.bot_api_key)

// Переменные логики:
let waiting_file_status = 0


/*
Или же, вариант чтения ключа из файла. 
Проект будет загружен на гитхаб, поэтому нельзя в нем оставить ключ
*/
// Подключение файловой системы, для работы с файлами
const fileSys = require('fs');
const { error } = require('console');

// Переменная, хранящая путь к файлу с ключом:
//const pathToFile = '../js_tg_bot_token.txt'; 

// Чтение файла, сохранение текста в переменную. Параметры после пути необязательны.
// Второй параметр - кодировка файла
// Третий параметр - флаг (чтение/чтение и запись/тп).
// r - открывает файл для чтения. Возникает ошибка, если файла нет.
// а - открыть файл для добавления данных. Файл создается, если он не существует
//const data = fileSys.readFileSync(pathToFile, {encoding: 'utf8', flag: 'r'});

//stringFromFile = stringFromFile.replace(/\r\n/q, '1'); // Удаление переносов строк и каретки. Особо не нужно, но вдруг.

const bot = new Bot(process.env.bot_api_key);

// Главная функция бота - это отвечать на сообщения и команды пользователя
// В Grammy, ответ на сообщения и команды, реализован с помощью добавления обработчиков (слушателей определенных событий)
/*
Виды обработчиков в grammy:
1) Ответ на команды (bot.command).
Команда - любая последовательность знаков без пробелов после / (только английские буквы)
*/

// Также, пользователю можно выдать список доступных команд:
bot.api.setMyCommands([
    {
        command: 'start', 
        description: 'Запуск бота',
    },
    /*
    {
        command: 'hello', 
        description: 'Приветствие',
    },
    */
    /* Команды через кэмел или снейк кейс, не работают в меню
    {
        command: 'hello_Friend', 
        description: 'Приветствие',
    },
    */
    // Благодаря этой инструкции, в левом нижнем углу бота в тг, появилась кнопка со списком команд
]);

// Если просто написать bot.start();, бот запустится, но никак не будет реагировать на сообщения
// Чтобы бот реагировал, нужно добавить соответствующий код на команду start и любое сообщение пользователя
// Для добавления обработчика команды, на bot нужно повесить слушателя:
// Первый каргумент - название команды. Второй - запускаемая колбек функция. Она должна быть асинхронной.
// ctx (context) -  отдельный объект, который например, позволяет отвечать пользователю с помощью метода reply
bot.command('start', async (ctx) => {
    await ctx.reply('Рад приветствовать! Это бот для сохранения закладок. Пиши сюда текстовые сообщения или файлы, я сохраню их на компьютере.\nОграничение по длине текстового сообщения - 500 символов\nОграничение по размеру файла - 20мб')
});

/*
// Также можно передать массив команд вместо одной.
bot.command(['hello', 'hi', 'helloFriend'], async (ctx) => {
    await ctx.reply('Йоу! как день?')
});
*/

// Функция для скачивания файла
async function downloadFile(url, filePath, fs) {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(filePath); // Создаем поток для записи файла
        const https = require("https");
        https.get(url, (response) => {
          response.pipe(fileStream); // Передаем данные в файл
          fileStream.on("finish", () => {
            fileStream.close();
            resolve();
          });
          fileStream.on("error", (err) => {
            fs.unlink(filePath, () => {}); // Удаляем файл в случае ошибки
            reject(err);
          });
        }).on("error", (err) => {
          fs.unlink(filePath, () => {}); // Удаляем файл в случае ошибки
          reject(err);
        });
      });
}

// Событие получения документа. Сохранение полученного файла в папку
bot.on(':file', async (ctx) => {
    await ctx.reply("Вы отправили файл.");

    // Получение размера файла в битах до его скачивания
    const file_size = ctx.message.document.file_size;
    ctx.reply(`Получен файл размером ${file_size} байт`);


    if (file_size > 20000000) {
        console.log("Получен файл больше 20мб. Отмена обработки.");
        ctx.reply("Получен файл больше 20мб. Отмена обработки.");
        //throw new error;
    }
    else {
        console.log("Получен файл меньше 20 мб.")

        // Переменная хранящая ид файла
        const dock_id = ctx.message.document.file_id;
        // Переменная хранящая имя файла
        const dock_name = ctx.message.document.file_name;
        // Путь??
        const path = require("path");

        // Переменая хранящая полученный файл
        const user_dock = await ctx.api.getFile(dock_id);

        // Формируем url файла для скачивания
        const dock_url = `https://api.telegram.org/file/bot${bot.token}/${user_dock.file_path}`;

        // Ответ пользователю
        await ctx.reply("Вы отправили файл. \r\nИд файла: " + dock_id + ".\r\nИмя файла: " + dock_name);

        var now = new Date();
        const day = now.getDate();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        // Путь для сохранения скачиваемого файла
        const local_file_path = `./documents/${day}_${month}_${year}`

        const fileSys = require('fs');
        
        // Создание папки для хранения документов за текцщую дату 
        try {
            if (!fileSys.existsSync(local_file_path)) {
                fileSys.mkdirSync(local_file_path);
                console.log(`Создана папка для хранения файлов за текущую дату: (${day}_${month}_${year})`)
            }
            else {console.log(`Папка для хранения файлов за текущую дату уже существует: (${day}_${month}_${year})`);}
            try {
                console.log(path.join(local_file_path, dock_name));
                const time = `${now.getHours()}_${now.getMinutes()}_${now.getSeconds()}_${now.getMilliseconds()}`;
                await downloadFile(dock_url, path.join(local_file_path, `${ctx.message.from.username}_${time}_${dock_name}`), fileSys);
                console.log(`Файл записан: ${dock_name}`);
                await ctx.reply("Файл сохранен.");
            }
            catch {
                console.log(`Ошибка записи файла`);
                await ctx.reply("Ошибка сохранения файла.");
            }
        }
        catch (err) {
            console.log(`Ошибка создания папки для хранения файлов за текущую дату: ${err}`);
        }
        }

})

// // Неудачная попытка создать событие для сохранения файлов. Может пригодиться
// // Событие получения документа. Сохранение полученного файла в папку
// bot.on('message:document', async (ctx) => {
//     await ctx.reply("Вы отправили документ.");
//     // Переменная хранящая ид файла
//     const dock_id = ctx.message.document.file_id;
//     // Переменная хранящая имя файла
//     const dock_name = ctx.message.document.file_name;
//     // Переменая хранящая полученный файл
//     const user_dock = await ctx.api.getFile(dock_id);
//     // Еще один вариант
//     const file = await ctx.getFile();
//     // Формируем url файла для скачивания
//     const dock_url = `https://api.telegram.org/file/bot${bot.token}/${user_dock.file_path}`;
//     // Ответ пользователю
//     await ctx.reply("Вы отправили файл. \r\nИд файла: " + dock_id + ".\r\nИмя файла: " + dock_name);
//     // Создание папки для хранения документов за текцщую дату 
//     var now = new Date();
//     const day = now.getDate();
//     const month = now.getMonth() + 1;
//     const year = now.getFullYear();
//     // Путь для сохранения скачиваемого файла
//     const local_file_path = `./documents/${day}_${month}_${year}`
//     const fileSys = require('fs');
//     try {
//         if (!fileSys.existsSync(local_file_path)) {
//             fileSys.mkdirSync(local_file_path);
//             console.log(`Создана папка для хранения файлов за текущую дату: (${day}_${month}_${year})`)
//         }
//         else {console.log(`Папка для хранения файлов за текущую дату уже существует: (${day}_${month}_${year})`);}
//         try {
//             fileSys.writeFile(`${local_file_path}/file.txt`, file);
//             console.log(`Файл записан: ${dock_name}`);
//             await ctx.reply("Файл сохранен.");
//         }
//         catch {
//             console.log(`Ошибка записи файла`);
//             await ctx.reply("Ошибка сохранения файла.");
//         }
//     }
//     catch (err) {
//         console.log(`Ошибка создания папки для хранения файлов за текущую дату: ${err}`);
//     }
// })

// Также, можно использовать встроенный функционал grammy для фильтрации сообщений, вместо ифов
bot.on('message:text', async (ctx) => {
    let lenStr = ctx.message.text.length;
    if (lenStr > 500) {
        await ctx.reply('Сообщение слишком большое. Максимум 500 символов.');
        if (!(e instanceof Error)) {e = new Error(e);}
    }

    var now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    console.log(`Получено сообщение с текстом: ${ctx.message.text}. От: ${ctx.message.from.username}. Время: ${'Год: ' + year + ' Месяц: ' + month + ' День: ' + day + ' Время: ' + now.getHours() + '.' + now.getMinutes()}`);
    
    // Чтение файла с заметками за текущую дату. Если файла нет, он будет создан
    const fileSys = require('fs');
    const pathToFile = `./notes/${day + "_" + month + "_" + year + "_Notes"}.txt`;
    console.log(pathToFile);
    /* Шпоргалка чтения файла в массив строк
    const data = fileSys.readFileSync(pathToFile, {encoding: 'utf8', flag: 'r'});
    // Переводим полученную единую строку в массив строк. Делим по разделителю строк
    let dataArr = data.split('\r\n');
    // Убираем пустые строки (хотя в файле их быть не должно)
    dataArr = dataArr.filter(line => line.trim() !== '');
    */
    // Добавление текста сообщения в файл с заметками за текцщую дату. Если файла нет, он будет создан в формате "09_02_2025_Notes.txt"
    fileSys.writeFileSync(pathToFile, ctx.message.text + ' (Время: ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + ' От: ' + ctx.message.from.username + ' id:' + ctx.message.from.id + ')' + '\r\n', {encoding: 'utf8', flag: 'a'});

    // Отправка статуса получения сообщения
    await ctx.reply('Сообщение получено. Добавлено в закладки за текущую дату.');
});

/* Варианты работы с событиями в grammy:
// Можно комбинировать события
bot.on('message:photo').on('message:voice', async (ctx) => {
    //await ctx.reply('Сообщение получено.');
    var now = new Date();
    console.log(`Получено голосовое сообщение и фото: ${ctx.message.text}. Время: ${'Год: ' + now.getFullYear() + ' Месяц: ' + (now.getMonth() + 1) + ' День: ' + now.getDate() + ' Время: ' + now.getHours() + '.' + now.getMinutes()}`);
});
bot.on('message:entities:url', async (ctx) => {
    //await ctx.reply('Сообщение получено.');
    var now = new Date();
    console.log(`Получено сообщение с сылкой: ${ctx.message.text}. Время: ${'Год: ' + now.getFullYear() + ' Месяц: ' + (now.getMonth() + 1) + ' День: ' + now.getDate() + ' Время: ' + now.getHours() + '.' + now.getMinutes()}`);
});

// Бот может отреагировать на любое сообщение, например:
bot.on('message', async (ctx) => {
    if (ctx.message.text == 1) {
        await ctx.reply('Первый вариант');
        console.log(`Получено сообщение: ${ctx.message.text}`);
    }
    else if (ctx.message.text == 2) {
        await ctx.reply('Второй вариант');
        console.log(`Получено сообщение: ${ctx.message.text}`);
    }
    else {
        await ctx.reply('Сообщение получено.');
        console.log(`Получено сообщение: ${ctx.message.text}`);
    }
});
*/

// Работа с обработкой ошибок
bot.catch((err) => {
    // Создание переменной с информацией о ошибке
    const ctx = err.ctx;
    // Вывод сообщения о возникновении ошибки в консоль
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    // Получение самой ошибки
    const er = err.error;

    // Теперь нужно проверить, какого типа эта ошибка 
    // Используя GrammyError и HttpError, можно понять, к какому инстансу относится ошибка
    if (er instanceof GrammyError) {
        // Значит, скорее всего, ошибка в запросе
        //console.error("Error in request:", e.description)
    }
    else if (er instanceof HttpError) {
        // Значит, что мы скорее всего, не можем связаться с телеграммом
        console.error("Could not contract telegram:", er);
    } 
    else {
        // Значит, неизвестная ошибка
        console.error("Unknown error:", er);
    }
});


// Все обработчики событий должны быть описаны до строки старта бота
// Запуск бота
bot.start();