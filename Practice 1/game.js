const player = document.getElementById("player");
const obstacle = document.getElementById("obstacle");
const scoreText = document.getElementById("score");
const gameArea = document.getElementById("game");
const restartButton = document.getElementById("restartButton");
const pauseButton = document.getElementById("pauseButton");

let jumping = false;
let score = 0;
let paused = false;
const START_SPEED = 5;
let speed = START_SPEED;

// Jump
document.addEventListener("keydown", function(event){

    if(event.code === "Space" && jumping === false){

        event.preventDefault();

        if (paused) return;

        jumping = true;

        let jumpHeight = 0;

        let jump = setInterval(function(){

            if(jumpHeight >= 120){
                clearInterval(jump);

                let fall = setInterval(function(){

                    jumpHeight -= 5;
                    player.style.bottom = jumpHeight + "px";

                    if(jumpHeight <= 0){
                        clearInterval(fall);
                        jumping = false;
                    }

                },20);

            }
            else{
                jumpHeight += 5;
                player.style.bottom = jumpHeight + "px";
            }

        },20);
    }

});


// Move obstacle
let obstaclePosition = gameArea.clientWidth;

let game = setInterval(function(){

    if(paused){
        return;
    }

    obstaclePosition -= speed;

    obstacle.style.left = obstaclePosition + "px";


    // Reset obstacle
    if(obstaclePosition < -30){
        obstaclePosition = gameArea.clientWidth;
        score++;
        scoreText.textContent = score;
        if(speed < 20){
        speed *= 1.05;
    }
    }


    // Collision
    let playerBottom = parseInt(
        window.getComputedStyle(player).bottom
    );

    if(
        obstaclePosition < 90 &&
        obstaclePosition > 40 &&
        playerBottom < 50
    ){
        alert("Game Over! Score: " + score);

        obstaclePosition = gameArea.clientWidth;
        score = 0;
        scoreText.textContent = score;
        speed = START_SPEED;
        console.log("Speed reset:", speed);
    }


},20);





function restartGame(){
    score = 0;
    scoreText.textContent = score;
    obstaclePosition = gameArea.clientWidth;
    obstacle.style.left = obstaclePosition + "px";
    speed = START_SPEED;
}

function pauseGame(){

    paused = !paused;

    if(paused){
        pauseButton.textContent = "Resume";
    }
    else{
        pauseButton.textContent = "Pause";
    }

}

restartButton.addEventListener("click", restartGame);
pauseButton.addEventListener("click", pauseGame);
