function isDesktop(): boolean {
    const userAgent = navigator.userAgent

    const isDesktop = /Windows|Macintosh|Linux/i.test(userAgent)
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(userAgent)

    return isDesktop && !isMobile
}

export { isDesktop }