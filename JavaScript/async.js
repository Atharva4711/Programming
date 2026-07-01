function flipCoin() {
    return new Promise((resolve, reject) => {
        console.log("Coin is spinning in the air...");

        setTimeout(() => {
            let isHeads = Math.random() > 0.5;

            if (isHeads) {
                resolve("You won! It landed on Heads.");
            } else {
                reject("You lost! It landed on Tails.");
            }
        }, 1500);
    });
}

flipCoin()
    .then((result) => {
        console.log(result);
    })
    .catch((error) => {
        console.log(error);
    });

console.log("Place your bets!");