const checkLoaded = (emit: any) => {
  const images = Array.from(document.images);
  const allImagesLoaded = images.every(img => img.complete);

  if (allImagesLoaded) {
    emit('loaded');
  } else {
    setTimeout(() => checkLoaded(emit), 100);
  }
};

export { checkLoaded };