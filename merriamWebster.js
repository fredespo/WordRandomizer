const request = require('request-promise');
const cheerio = require('cheerio');

class WordScrape {
    constructor(letter) {
        this.letter = letter;
        this.pageNum = 1;
        this.website = 'https://www.merriam-webster.com';
        this.page = '/browse/dictionary/';
        this.includeHyphenated = false;
        this.includeProper = false;
        this.includePhrases = false;
        this.includePrefixes = false;
        this.includeSuffixes = false;
        this.includeAcronyms = false;
    }

    shouldAdd(word) {
        if(this.hasNumber(word) || this.hasUnsupportedChars(word)) {
            return false;
        }

        if(!this.includeHyphenated && this.isHyphenated(word)) {
            return false;
        }

        if(!this.includeProper && this.isProper(word)) {
            return false;
        }
        
        if(!this.includePhrases && this.isPhrase(word)) {
            return false;
        }

        if(!this.includePrefixes && this.isPrefix(word)) {
            return false;
        }

        if(!this.includeSuffixes && this.isSuffix(word)) {
            return false;
        }

        if(!this.includeAcronyms && this.isAcronym(word)) {
            return false;
        }

        return true;
    }

    scrape(onComplete) {
        var words = [];
        var f = (error, response, html) => {
            if(!error && response.statusCode == 200) {
                const $= cheerio.load(html);
                $(".entries").each((i, data) => {
                    const item = $(data).text().replace(/^\s+|\s+$/gm,'');
                    var newWords = item.split('\n');
                    newWords.forEach(newWord => {
                        newWord = this.cleanSpecialChars(newWord);
                        if(this.shouldAdd(newWord)) {
                            words.push(newWord);
                        }
                    });
                })
                this.pageNum++;
                var nextPageLink = this.page + this.letter + "/" + this.pageNum;
                var foundNextPageLink = false;
                $("a").each((i, data) => {
                    var link = ($(data).attr('href'));
                    if(link == nextPageLink) {
                        request(this.website + link, f);
                        foundNextPageLink = true;
                        return false;
                    }
                });
                if(!foundNextPageLink) {
                    onComplete(words);
                }
            }
        };
        var initialLink = this.website + this.page + this.letter;
        request(initialLink, f);
    }

    hasNumber(myString) {
        return /\d/.test(myString);
    }

    //jspdf doesn't support UTF-8 characters :(
    cleanSpecialChars(string) {
        var newString = string.replace('ʽ', '\'');
        return newString;
    }

    //jspdf doesn't support UTF-8 characters :(
    hasUnsupportedChars(string) {
        return/[^\x00-\x7F]/g.test(string);
    }

    isLetter(c) {
        return c.toLowerCase() != c.toUpperCase();
    }

    isUpperCaseLetter(c) {
        return this.isLetter(c) && c === c.toUpperCase();
    }

    isLowerCaseLetter(c) {
        return this.isLetter(c) && c === c.toLowerCase();
    }

    isHyphenated(word) {
        return word.includes("-") && !word.startsWith("-") && !word.endsWith("-");
    }

    indexOfFirstLetter(string) {
        var firstLetterIndex = null;
        for(let i = 0; i < string.length; i++) {
            if(this.isLetter(string.charAt(i))) {
                firstLetterIndex = i;
                break;
            }
        }
        return firstLetterIndex;
    }

    isProper(word) {
        var firstLetterAt = this.indexOfFirstLetter(word);
        if(firstLetterAt == null || !this.isUpperCaseLetter(word.charAt(firstLetterAt))) {
            return false;
        }
        for(let i = firstLetterAt + 1; i < word.length; i++) {
            if(this.isLetter(word.charAt(i)) && !this.isLowerCaseLetter(word.charAt(i))) {
                return false;
            }
        }
        return true;
    }

    isPhrase(word) {
        return word.includes(" ");
    }

    isPrefix(word) {
        return word.endsWith("-");
    }

    isSuffix(word) {
        return word.startsWith("-");
    }

    isAcronym(word) {
        var isLowercaseAcronym = true;
        for(let i = 0; i < word.length; i += 2) {
            if(i+1 >= word.length || !this.isLetter(word.charAt(i)) || word.charAt(i+1) != '.') {
                isLowercaseAcronym = false;
                break;
            }
        }

        var isUpeprcaseAcronym = true;
        for (let i = 0; i < word.length; i++) {
            if(!this.isUpperCaseLetter(word.charAt(i)) && word.charAt(i) != "." && word.charAt(i) != '/' && word.charAt(i) != '&' && (i != word.length - 1 || word.charAt(i) != 's') && (i != word.length - 2 || word.charAt(i) != '\'')) {
                isUpeprcaseAcronym = false;
                break;
            }
        }
        if(!isLowercaseAcronym && !isUpeprcaseAcronym) {
            return false;
        }
        return true;
    }
}

window.getWordsFromMerriamWebster = function(includeHyphenated, includeProper, includePhrases, includePrefixes, includeSuffixes, includeAcronyms, onProgress, onComplete) {
    var letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'x', 'y', 'z'];
    var letterIdx = 0;
    var allWords = [];
    var letterIsDoneCallback = function(words) {
        allWords.push(words);
        if(++letterIdx < letters.length) {
            var progressPct = Math.round(letterIdx / letters.length * 100);
            onProgress(progressPct);
            var wordScrape = new WordScrape(letters[letterIdx]);
            wordScrape.includeHyphenated = includeHyphenated;
            wordScrape.includeProper = includeProper;
            wordScrape.includePhrases = includePhrases;
            wordScrape.includePrefixes = includePrefixes;
            wordScrape.includeSuffixes = includeSuffixes;
            wordScrape.includeAcronyms = includeAcronyms;
            wordScrape.scrape(letterIsDoneCallback);
        }
        else {
            allWords = allWords.flat();
            onComplete(allWords);
        }
    };
    var wordScrape = new WordScrape(letters[0]);
    wordScrape.includeHyphenated = includeHyphenated;
    wordScrape.includeProper = includeProper;
    wordScrape.includePhrases = includePhrases;
    wordScrape.includePrefixes = includePrefixes;
    wordScrape.includeSuffixes = includeSuffixes;
    wordScrape.includeAcronyms = includeAcronyms;
    wordScrape.scrape(letterIsDoneCallback);
}
