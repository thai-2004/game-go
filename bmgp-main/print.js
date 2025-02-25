const starContainer = document.querySelector('.stars');
    const starCount = 50;

    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.classList.add('star');
      star.style.setProperty('--star-tail-length', `${Math.random() * 7 + 5}em`);
      star.style.setProperty('--top-offset', `${Math.random() * 100}vh`);
      star.style.setProperty('--fall-duration', `${Math.random() * 6 + 6}s`);
      star.style.setProperty('--fall-delay', `${Math.random() * 10}s`);
      starContainer.appendChild(star);
    }






