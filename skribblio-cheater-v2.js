const puppeteer = require('puppeteer');

(async () => {
    async function connectBrowser() {
        const browserURL = 'http://127.0.0.1:42069';
        const browser = await puppeteer.connect({ browserURL });
        const pages = await browser.pages();
        return { pages, browser };
    }

    let customOptions = {
        gameLink: 'https://skribbl.io/'
    }

    let languages = [
        "English",
        "German",
        "Bulgarian",
        "Czech",
        "Danish",
        "Dutch",
        "Finnish",
        "French",
        "Estonian",
        "Greek",
        "Hebrew",
        "Hungarian",
        "Italian",
        "Korean",
        "Latvian",
        "Macedonian",
        "Norwegian",
        "Portuguese",
        "Polish",
        "Romanian",
        "Serbian",
        "Slovakian",
        "Spanish",
        "Swedish",
        "Tagalog",
        "Turkish"
    ]

    let menuOptions = {
        name: 'robot man',
        language: languages[0],
        skipLogin: false
    }

    async function guesser(waitMode) {

        let gameOptions = {
            time: 80,
            customWords: [],
            rateLimit: 900
        }

        async function fetcher() {
            await skribbl.waitForSelector('#currentWord', { timeout: 0 });
            let wordInfo = await skribbl.evaluate(() => {
                let word = document.querySelector('#currentWord');
                return [word.innerText.length, word.innerText];
            });
            console.log('WORD INFO: ' + await wordInfo[0] + ' chars | ' + await wordInfo[1]);

            let wordList;

            if (gameOptions.customWords.length !== 0) {
                wordList = gameOptions.customWords
            } else {
                await hints.bringToFront();
                await hints.evaluate(() => {
                    document.querySelector('#searchBox').value = '' // reset searchBox
                });
                await hints.type('#searchBox', wordInfo[1]); // search for possible words
                await hints.waitForFunction('document.querySelector("#wordlist")', { timeout: 0 }); // wait for refresh
                wordList = await hints.evaluate(() => {
                    return document.querySelector("#wordlist").innerText.split('\n'); // generate wordList
                });
            }

            console.log('Possible words: \n', wordList);
            return [wordInfo, wordList];
        }

        if (waitMode == 'newRound') {
            await skribbl.waitForFunction(`document.querySelector("#timer").innerText == "${gameOptions.time}"`, { timeout: 0 }); // reset process when timer resets
            console.log('-- New Round --');
            await skribbl.waitForFunction(`document.querySelector("#timer").innerText !== "${gameOptions.time}"`, { timeout: 0 }); // start process when timer starts
            console.log('TIMER HAS STARTED');
        }

        let wordSet = await fetcher();

        let wordInfo = wordSet[0];
        let wordList = wordSet[1];

        await skribbl.bringToFront();

        await skribbl.waitForXPath(`//div[contains(text(),'${menuOptions.name} (You)')]/ancestor::div[contains(@class, 'player')]`, { visible: true, timeout: 0 });
        await skribbl.waitForSelector('#timer', { timeout: 0 });
        await skribbl.waitForSelector('#overlay', { timeout: 0 });

        for (let word of wordList) {
            let guessedWord = await skribbl.evaluate((menuOptions) => {
                return document.evaluate(`//div[contains(text(),'${menuOptions.name} (You)')]/ancestor::div[contains(@class, 'player')]`,
                    document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.classList[1] == 'guessedWord'
            }, menuOptions);

            let timer = await skribbl.evaluate(() => {
                return document.querySelector("#timer").innerText
            })

            let roundOver = await skribbl.evaluate(() => {
                return document.querySelector("#overlay").style.opacity !== '0'
            });

            let newWordInfo = await skribbl.evaluate(() => {
                let word = document.querySelector('#currentWord');
                return word.innerText;
            });

            if ((timer == '0') || (roundOver == 'true')) {
                console.log('ROUND ENDED')
                waitMode = 'newRound';
                break;
            } else if (guessedWord == true) {
                waitMode = 'newRound';
                console.log('Word guessed!');
                console.log('Waiting for round to end... ');
                break;
            } else if (wordInfo[1] !== newWordInfo) {
                waitMode = 'refetch';
                break;
            } else {
                console.log('Now entering: ' + word);
                await skribbl.type('#inputChat', word);
                await skribbl.keyboard.press('Enter');
                await skribbl.waitForTimeout(gameOptions.rateLimit);
            }
        }

        guesser(waitMode);
    }

    // initialization
    const { pages, browser } = await connectBrowser();

    let windowSize = await pages[0].evaluate(() => {
        return { x: screen.availWidth - 200, y: screen.availHeight - 200 }
    });

    const hints = await browser.newPage();
    await hints.setViewport({ width: windowSize.x, height: windowSize.y });
    await hints.goto('https://skribbliohints.github.io/');
    await hints.waitForSelector('#searchBox', { timeout: 0 });

    const skribbl = pages[0];
    await skribbl.setViewport({ width: windowSize.x, height: windowSize.y });
    if (menuOptions.skipLogin == false) { await skribbl.goto(customOptions.gameLink, { waitUntil: 'load' }) }
    await skribbl.bringToFront();

    if (menuOptions.skipLogin == false) {
        // login and enter game
        await skribbl.waitForSelector('#inputName', { timeout: 0 });
        await skribbl.evaluate((menuOptions) => {
            document.querySelector('#inputName').value = menuOptions.name // set display name
        }, menuOptions);

        await skribbl.waitForSelector('#loginLanguage', { timeout: 0 });
        await skribbl.select('#loginLanguage', menuOptions.language);
    
        await skribbl.evaluate(() => {
            document.querySelectorAll('button')[0].click(); // clicking "Play"
        });
    }


    await skribbl.waitForSelector('#timer', { timeout: 0 });
    console.log('LOADED INTO THE GAME');


    // gameplay
    await guesser('newRound');

})()