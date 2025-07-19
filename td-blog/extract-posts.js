const fs = require('fs');
const path = require('path');

// Read the WordPress XML file
const xmlData = fs.readFileSync(path.join(__dirname, 'data/blog-content.xml'), 'utf8');

// Extract blog posts
const postMatches = xmlData.match(/<item>[\s\S]*?<\/item>/g) || [];

console.log(`Found ${postMatches.length} posts in WordPress XML`);

let processedCount = 0;
let publishedCount = 0;

postMatches.forEach((post, index) => {
  try {
    // Extract post data
    const titleMatch = post.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const linkMatch = post.match(/<link>(.*?)<\/link>/);
    const dateMatch = post.match(/<pubDate>(.*?)<\/pubDate>/);
    const statusMatch = post.match(/<wp:status><!\[CDATA\[(.*?)\]\]><\/wp:status>/);
    const contentMatch = post.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    const excerptMatch = post.match(/<excerpt:encoded><!\[CDATA\[(.*?)\]\]><\/excerpt:encoded>/);
    
    // Only process published posts
    if (!statusMatch || statusMatch[1] !== 'publish') {
      return;
    }
    
    if (!titleMatch || !linkMatch || !contentMatch) {
      console.log(`Skipping post ${index + 1}: Missing required data`);
      return;
    }
    
    const title = titleMatch[1];
    const url = linkMatch[1].replace('https://blog.trainerday.com', '');
    const date = dateMatch ? new Date(dateMatch[1]).toLocaleDateString() : '';
    let content = contentMatch[1];
    const excerpt = excerptMatch ? excerptMatch[1] : content.replace(/<[^>]*>/g, '').substring(0, 200) + '...';
    
    // Clean up content and preserve formatting
    content = content
      // Fix image URLs - use local images first, fallback to remote
      .replace(/src="https:\/\/blog\.trainerday\.com\/wp-content\/uploads\/([^"]*)"[^>]*>/g, function(match, urlPath) {
        // Try to find local image mapping
        const originalUrl = 'https://blog.trainerday.com/wp-content/uploads/' + urlPath;
        const imageMapping = {
        "https://blog.trainerday.com/wp-content/uploads/2024/03/00MjCZDHaHGG_2YTe.png": "/images/blog/2024-03-00MjCZDHaHGG_2YTe.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/00if5SqWE4ltq647D.jpg": "/images/blog/2024-03-00if5SqWE4ltq647D.jpg",
        "http://blog.trainerday.com/wp-content/uploads/2024/03/cropped-td_logo_bk_red.png": "/images/blog/2024-03-cropped-td_logo_bk_red.png",
        "https://blog.trainerday.com/wp-content/swift-ai/images/wp-content/uploads/2024/03/1sR5AMgP5bhBPkDk2IpNujg-png.webp": "/images/blog/2024-03-1sR5AMgP5bhBPkDk2IpNujg-png.webp",
        "https://blog.trainerday.com/wp-content/uploads/2023/11/image.png": "/images/blog/2023-11-image.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/02YWNDb7B24fkotxz.jpg": "/images/blog/2024-03-02YWNDb7B24fkotxz.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/02jJJg8rtMXBShm9u.jpg": "/images/blog/2024-03-02jJJg8rtMXBShm9u.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/03sr68A1Uz-c4N0aZ.jpg": "/images/blog/2024-03-03sr68A1Uz-c4N0aZ.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/04sk90tTRsEFdyk8Q.png": "/images/blog/2024-03-04sk90tTRsEFdyk8Q.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/053ILLceimq1nfuB1.jpg": "/images/blog/2024-03-053ILLceimq1nfuB1.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/06-h6ak11ygWKtUES.jpg": "/images/blog/2024-03-06-h6ak11ygWKtUES.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/05_ElZpolcyth6KoM.jpg": "/images/blog/2024-03-05_ElZpolcyth6KoM.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/05eKzq0mSWlE8GFae.jpg": "/images/blog/2024-03-05eKzq0mSWlE8GFae.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/07edHXRV-WnnvSkUH.png": "/images/blog/2024-03-07edHXRV-WnnvSkUH.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/05lexCo17akxvKStz.png": "/images/blog/2024-03-05lexCo17akxvKStz.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/08GpaEfkyz9VZJWzf.jpg": "/images/blog/2024-03-08GpaEfkyz9VZJWzf.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0BhDsCpmXs-jrDTce.png": "/images/blog/2024-03-0BhDsCpmXs-jrDTce.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0AeHkZVAYuIcNXo46.jpg": "/images/blog/2024-03-0AeHkZVAYuIcNXo46.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0Bu2REA0NH1jSzhp.jpg": "/images/blog/2024-03-0Bu2REA0NH1jSzhp.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0BTV9APSjh0EexkYv.jpg": "/images/blog/2024-03-0BTV9APSjh0EexkYv.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0DOON9ouH2kI4hQQP.png": "/images/blog/2024-03-0DOON9ouH2kI4hQQP.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0GRt8jvqURaHyreXx.jpg": "/images/blog/2024-03-0GRt8jvqURaHyreXx.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0GrsbsnrusKoBl1UK.png": "/images/blog/2024-03-0GrsbsnrusKoBl1UK.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0C5V8JoTjjKeqvLy8.png": "/images/blog/2024-03-0C5V8JoTjjKeqvLy8.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0IHoHOk-rkd8FrAl7.png": "/images/blog/2024-03-0IHoHOk-rkd8FrAl7.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0LOfN24R21G0LF2Rl.jpg": "/images/blog/2024-03-0LOfN24R21G0LF2Rl.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0Iq8HTr36dEicYZgV.jpg": "/images/blog/2024-03-0Iq8HTr36dEicYZgV.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0K_z9MCSaxiQbE2GE.jpg": "/images/blog/2024-03-0K_z9MCSaxiQbE2GE.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0IvCN8UOX7Kmablja.jpg": "/images/blog/2024-03-0IvCN8UOX7Kmablja.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0LZpCJ_cjjW8LEeUl.jpg": "/images/blog/2024-03-0LZpCJ_cjjW8LEeUl.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0NIgIg17aIicTYK50.jpg": "/images/blog/2024-03-0NIgIg17aIicTYK50.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0O2lfL1wWm_zj51ts.png": "/images/blog/2024-03-0O2lfL1wWm_zj51ts.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0NmeCYOnNMeo_5HXr.png": "/images/blog/2024-03-0NmeCYOnNMeo_5HXr.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0NrJ2zksi6xF1B3Wi.png": "/images/blog/2024-03-0NrJ2zksi6xF1B3Wi.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0Mu5FyWaSQyWQSW1U.png": "/images/blog/2024-03-0Mu5FyWaSQyWQSW1U.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0PA_iO5sNbCV38XlL.jpg": "/images/blog/2024-03-0PA_iO5sNbCV38XlL.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0RO1Q9M8aY2M3QhHV.jpg": "/images/blog/2024-03-0RO1Q9M8aY2M3QhHV.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0RCzJRRhdXkPYXl9e.jpg": "/images/blog/2024-03-0RCzJRRhdXkPYXl9e.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0Pgdgv8rUebqRLGbC.png": "/images/blog/2024-03-0Pgdgv8rUebqRLGbC.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0QyCif-zcMZrA7tQ.png": "/images/blog/2024-03-0QyCif-zcMZrA7tQ.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0U-GeeI5Mc051h95E.jpg": "/images/blog/2024-03-0U-GeeI5Mc051h95E.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0TiezPrZS0i_JY7WQ.jpg": "/images/blog/2024-03-0TiezPrZS0i_JY7WQ.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0TOqNMHh15K4t9Q0D.png": "/images/blog/2024-03-0TOqNMHh15K4t9Q0D.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0RRh402_XqybSuGBV.png": "/images/blog/2024-03-0RRh402_XqybSuGBV.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0RY2qHvSJl4KnW5rQ.png": "/images/blog/2024-03-0RY2qHvSJl4KnW5rQ.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0WMKgtVgSB5QqRE8V.jpg": "/images/blog/2024-03-0WMKgtVgSB5QqRE8V.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0V6xIsRGQ-ex1Mx45.jpg": "/images/blog/2024-03-0V6xIsRGQ-ex1Mx45.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0U1H-eCHwiqxOEPEE.jpg": "/images/blog/2024-03-0U1H-eCHwiqxOEPEE.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0VIhh0NIJTULKh2GA.jpg": "/images/blog/2024-03-0VIhh0NIJTULKh2GA.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0Ux96-aO7PI4BKqPo.png": "/images/blog/2024-03-0Ux96-aO7PI4BKqPo.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0WVmL4pI8fTbu_xpU.jpg": "/images/blog/2024-03-0WVmL4pI8fTbu_xpU.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0Wp8XKIfqHQH-nd0P.jpg": "/images/blog/2024-03-0Wp8XKIfqHQH-nd0P.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0XOzrJ9RinsaYnqv8.png": "/images/blog/2024-03-0XOzrJ9RinsaYnqv8.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0_Ea78aE9khMEDcp7.png": "/images/blog/2024-03-0_Ea78aE9khMEDcp7.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0_1mWEZxbEZkC4VRQ.png": "/images/blog/2024-03-0_1mWEZxbEZkC4VRQ.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0a4Se7FMStLd4__u7.png": "/images/blog/2024-03-0a4Se7FMStLd4__u7.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0a9lke3SnybIfmfFU.png": "/images/blog/2024-03-0a9lke3SnybIfmfFU.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0bN-mxf7XLySPsZrM.jpg": "/images/blog/2024-03-0bN-mxf7XLySPsZrM.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0bKgaLAlGlVoznhFA.png": "/images/blog/2024-03-0bKgaLAlGlVoznhFA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0aQCWEwrcemsHW-_X.png": "/images/blog/2024-03-0aQCWEwrcemsHW-_X.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0bb6opA-UpeVi9Gta.png": "/images/blog/2024-03-0bb6opA-UpeVi9Gta.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0bSajC43XgSgjMdbg.jpg": "/images/blog/2024-03-0bSajC43XgSgjMdbg.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0bn_AYn85_Vyrs6Z1.jpg": "/images/blog/2024-03-0bn_AYn85_Vyrs6Z1.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0cVT0wRh3knmeEKOK.png": "/images/blog/2024-03-0cVT0wRh3knmeEKOK.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0cJ_WGtciwcJIMq0B.png": "/images/blog/2024-03-0cJ_WGtciwcJIMq0B.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0cymNak6fNn-586IU.png": "/images/blog/2024-03-0cymNak6fNn-586IU.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0e0loCGX0BDcWuck5.jpg": "/images/blog/2024-03-0e0loCGX0BDcWuck5.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0dR9m5ae0CFRJ_33K.jpg": "/images/blog/2024-03-0dR9m5ae0CFRJ_33K.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0dLS0cCVlSiHXHFey.png": "/images/blog/2024-03-0dLS0cCVlSiHXHFey.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0dBUgcEXPQvQguGIq.png": "/images/blog/2024-03-0dBUgcEXPQvQguGIq.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0fHcGTdsvE4Tmx55l.jpg": "/images/blog/2024-03-0fHcGTdsvE4Tmx55l.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0fNl2PsD2m9Z-5h1y.jpg": "/images/blog/2024-03-0fNl2PsD2m9Z-5h1y.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0gPkLfwmTVQODoEnk.jpg": "/images/blog/2024-03-0gPkLfwmTVQODoEnk.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0g-VB1_ZV3thHjvH1.png": "/images/blog/2024-03-0g-VB1_ZV3thHjvH1.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0fW7KujescxncZnQy.png": "/images/blog/2024-03-0fW7KujescxncZnQy.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0l1ZxgYVbCRKGsNaD.jpg": "/images/blog/2024-03-0l1ZxgYVbCRKGsNaD.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0hdqccTe7tBmvGrlQ.jpg": "/images/blog/2024-03-0hdqccTe7tBmvGrlQ.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0iv_xSzpOL1iwgdvj.jpg": "/images/blog/2024-03-0iv_xSzpOL1iwgdvj.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0hGttUAsyWEYot4iW.png": "/images/blog/2024-03-0hGttUAsyWEYot4iW.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0hJIesD4VbkZyJfpL.jpg": "/images/blog/2024-03-0hJIesD4VbkZyJfpL.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0oDRIyoBkBDOli6yj.jpg": "/images/blog/2024-03-0oDRIyoBkBDOli6yj.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0n_J4tN-QkAlrDK_C.jpg": "/images/blog/2024-03-0n_J4tN-QkAlrDK_C.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0mHMUkja7cZhR67_A.png": "/images/blog/2024-03-0mHMUkja7cZhR67_A.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0lkCdOPLnP9VcrxgQ.jpg": "/images/blog/2024-03-0lkCdOPLnP9VcrxgQ.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0lwjtQ19f-rGPQUwU.png": "/images/blog/2024-03-0lwjtQ19f-rGPQUwU.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0qOWORX6aQFslG_6Z.jpg": "/images/blog/2024-03-0qOWORX6aQFslG_6Z.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0pFm7f7La-pRtnJfM.png": "/images/blog/2024-03-0pFm7f7La-pRtnJfM.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0pEOaLR0G1vagKEA9.png": "/images/blog/2024-03-0pEOaLR0G1vagKEA9.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0oHJlM5YdflaMZpHb.jpg": "/images/blog/2024-03-0oHJlM5YdflaMZpHb.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0oZk9y0E0-TkFw0R7.png": "/images/blog/2024-03-0oZk9y0E0-TkFw0R7.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0tEX9iX-e_s3jfqNk.jpg": "/images/blog/2024-03-0tEX9iX-e_s3jfqNk.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0stGjusCeIyACZK31.png": "/images/blog/2024-03-0stGjusCeIyACZK31.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0rMTlLXCyb78AkA_c.png": "/images/blog/2024-03-0rMTlLXCyb78AkA_c.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0rv3RTf1m3B2zZ-3q.jpg": "/images/blog/2024-03-0rv3RTf1m3B2zZ-3q.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0tECQA7V8RNnacr38.png": "/images/blog/2024-03-0tECQA7V8RNnacr38.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0xYyOCvibyEmEczap.jpg": "/images/blog/2024-03-0xYyOCvibyEmEczap.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0tLNa4Vthm_Qxfd7t.jpg": "/images/blog/2024-03-0tLNa4Vthm_Qxfd7t.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0w5g1pN1y0bUi4rws.png": "/images/blog/2024-03-0w5g1pN1y0bUi4rws.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0vx44OG0LZWXBCQd3.jpg": "/images/blog/2024-03-0vx44OG0LZWXBCQd3.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0uczaMul-Vo9-D7yi.png": "/images/blog/2024-03-0uczaMul-Vo9-D7yi.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0zDz5ZM-_g2xs6q7u.png": "/images/blog/2024-03-0zDz5ZM-_g2xs6q7u.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0ysY46bOrDhfas0UX.jpg": "/images/blog/2024-03-0ysY46bOrDhfas0UX.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0xgaoVk6vxqund0VU.jpg": "/images/blog/2024-03-0xgaoVk6vxqund0VU.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0zawJbn2W3DGKdZy4.png": "/images/blog/2024-03-0zawJbn2W3DGKdZy4.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/0z5zduovTZat0S7Jd.png": "/images/blog/2024-03-0z5zduovTZat0S7Jd.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1-SKeL2NC1wtm7ZIiIlyMOA.png": "/images/blog/2024-03-1-SKeL2NC1wtm7ZIiIlyMOA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1-7PhbYf6E7aFGpuOi4H6WQ.jpg": "/images/blog/2024-03-1-7PhbYf6E7aFGpuOi4H6WQ.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/12yCvBOMMAtNSH-fVSxrpJg.png": "/images/blog/2024-03-12yCvBOMMAtNSH-fVSxrpJg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/102M3mcwpL9H8p68y262D2A.png": "/images/blog/2024-03-102M3mcwpL9H8p68y262D2A.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/11KdIuUp5V-Hcr3Xhdl-bcw.png": "/images/blog/2024-03-11KdIuUp5V-Hcr3Xhdl-bcw.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1642aczQanyN8_oNOXbycag.png": "/images/blog/2024-03-1642aczQanyN8_oNOXbycag.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/15Sl3Erf0b_Ae3N4fUCN-Bg.png": "/images/blog/2024-03-15Sl3Erf0b_Ae3N4fUCN-Bg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/15sXveVuIU5eu0t6y3ffoWA.png": "/images/blog/2024-03-15sXveVuIU5eu0t6y3ffoWA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/13EiQuO_3_l56P6JkQ77rzg.png": "/images/blog/2024-03-13EiQuO_3_l56P6JkQ77rzg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/142rtDhWAU2rH1e4q96mfuQ.png": "/images/blog/2024-03-142rtDhWAU2rH1e4q96mfuQ.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1EU3ACrT4mvZKmT3Lk_2dgw.png": "/images/blog/2024-03-1EU3ACrT4mvZKmT3Lk_2dgw.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1AZbm5oOs4CuF4QKoTc5jBQ.png": "/images/blog/2024-03-1AZbm5oOs4CuF4QKoTc5jBQ.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/18SnBAi6C3v2DH1eRk92ocw.png": "/images/blog/2024-03-18SnBAi6C3v2DH1eRk92ocw.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/18rRLiSGI6ZCtsrMBi-ZIAA.jpg": "/images/blog/2024-03-18rRLiSGI6ZCtsrMBi-ZIAA.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1EbQuHyEgyQD-730R4hJUuA.png": "/images/blog/2024-03-1EbQuHyEgyQD-730R4hJUuA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1Ffw5kDz2WGesQ4TxacgOQA.png": "/images/blog/2024-03-1Ffw5kDz2WGesQ4TxacgOQA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1LPjs7YTSJ4R65LORGdO61Q.png": "/images/blog/2024-03-1LPjs7YTSJ4R65LORGdO61Q.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1JZw3G_avdq2gq4594TV9Xw.png": "/images/blog/2024-03-1JZw3G_avdq2gq4594TV9Xw.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1GPaTDdRsjy85BzE8bQbeFg.png": "/images/blog/2024-03-1GPaTDdRsjy85BzE8bQbeFg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1KrHqj1HOWaT9PooNDLHRDA.png": "/images/blog/2024-03-1KrHqj1HOWaT9PooNDLHRDA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1PX1ii78bIjYnQfJcZZAFsg.png": "/images/blog/2024-03-1PX1ii78bIjYnQfJcZZAFsg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1NdkD86dcHkGGQZg7McKewA.png": "/images/blog/2024-03-1NdkD86dcHkGGQZg7McKewA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1MFYkCSe2xvDcrF3nePb-sg.png": "/images/blog/2024-03-1MFYkCSe2xvDcrF3nePb-sg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1P1FBVcebwpHxgEe1WxOqvA.png": "/images/blog/2024-03-1P1FBVcebwpHxgEe1WxOqvA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1MTC2rezD8SN25LvEg_BKNA.png": "/images/blog/2024-03-1MTC2rezD8SN25LvEg_BKNA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1TFrgQ6US9V-x3oQt0HgHgA.png": "/images/blog/2024-03-1TFrgQ6US9V-x3oQt0HgHgA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1SiNOB2gY63mKsr6DIlw1aA.jpg": "/images/blog/2024-03-1SiNOB2gY63mKsr6DIlw1aA.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1RXnP3qWbBVVeBkoJvIwoug.png": "/images/blog/2024-03-1RXnP3qWbBVVeBkoJvIwoug.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1Pns2Kdhvp2xCp-qhQxqlwA.png": "/images/blog/2024-03-1Pns2Kdhvp2xCp-qhQxqlwA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1SEE4bl2PaeNRObgK-MKVEw.png": "/images/blog/2024-03-1SEE4bl2PaeNRObgK-MKVEw.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1TiWbN2U-ajKksC969mHuvw.jpg": "/images/blog/2024-03-1TiWbN2U-ajKksC969mHuvw.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1UNuXY8ye3w3PlhiaGfHb0g.png": "/images/blog/2024-03-1UNuXY8ye3w3PlhiaGfHb0g.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1U6EArSHWkM8fvdXytetABw.png": "/images/blog/2024-03-1U6EArSHWkM8fvdXytetABw.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1UO6tta0GcD637qqkBGVJRA.png": "/images/blog/2024-03-1UO6tta0GcD637qqkBGVJRA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1Unr9nLpKP8_QgQbdvdFmwQ.png": "/images/blog/2024-03-1Unr9nLpKP8_QgQbdvdFmwQ.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1XHOFrfoPjWyRqWw0R4LIHg.png": "/images/blog/2024-03-1XHOFrfoPjWyRqWw0R4LIHg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1V3lIJfwpM6Ho4iv-r19e0Q.png": "/images/blog/2024-03-1V3lIJfwpM6Ho4iv-r19e0Q.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1VAnoRcjpYQI1mY-ukYsgcg.png": "/images/blog/2024-03-1VAnoRcjpYQI1mY-ukYsgcg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1Xavq0nDTBQfeyUg0y4KnAg.png": "/images/blog/2024-03-1Xavq0nDTBQfeyUg0y4KnAg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1V1-ynC6BY_Qe9bpQkODMTQ.png": "/images/blog/2024-03-1V1-ynC6BY_Qe9bpQkODMTQ.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1bk1UE7oAAAaRXNVksz3cFA.png": "/images/blog/2024-03-1bk1UE7oAAAaRXNVksz3cFA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1aLkjYKG84HxQaKVagV44oQ.png": "/images/blog/2024-03-1aLkjYKG84HxQaKVagV44oQ.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1_vXM4xxdmDUVefq8H6zHeA.png": "/images/blog/2024-03-1_vXM4xxdmDUVefq8H6zHeA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1YGJAPoIKmTmkYWNJTsMZhg.png": "/images/blog/2024-03-1YGJAPoIKmTmkYWNJTsMZhg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1XuCW9uuahYJU-52EUCzSiA.png": "/images/blog/2024-03-1XuCW9uuahYJU-52EUCzSiA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1bkTlJ12OP_3P5ArLXTVOHw.png": "/images/blog/2024-03-1bkTlJ12OP_3P5ArLXTVOHw.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1goZGVgjux-SKF7s3SvlKUA.png": "/images/blog/2024-03-1goZGVgjux-SKF7s3SvlKUA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1buEm22l1iqB7MhS0qRxhWA.jpg": "/images/blog/2024-03-1buEm22l1iqB7MhS0qRxhWA.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1dVRLJrpMNc2IMhnCL-BYJg.png": "/images/blog/2024-03-1dVRLJrpMNc2IMhnCL-BYJg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1dHHYgDpVndRUPRt4jtdXwg.png": "/images/blog/2024-03-1dHHYgDpVndRUPRt4jtdXwg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1iZNs64m-x2IBTDee4V6v0g.png": "/images/blog/2024-03-1iZNs64m-x2IBTDee4V6v0g.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1hL_EcYte2MZU7yoA4AuDiw.png": "/images/blog/2024-03-1hL_EcYte2MZU7yoA4AuDiw.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1gr4fQIRxl03MBD6OZ7s9WA.png": "/images/blog/2024-03-1gr4fQIRxl03MBD6OZ7s9WA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1hdzp6glEjvyBJIUsTp9nHw.png": "/images/blog/2024-03-1hdzp6glEjvyBJIUsTp9nHw.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1icvu5t9f-f1NjnD2flloZg.png": "/images/blog/2024-03-1icvu5t9f-f1NjnD2flloZg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1jUvTsuYQsVWtGz8afOWK1g.jpg": "/images/blog/2024-03-1jUvTsuYQsVWtGz8afOWK1g.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1lwv9_NqmII0sExACjPhegA.png": "/images/blog/2024-03-1lwv9_NqmII0sExACjPhegA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1l_e9DryU6Nv9jJID4uT4jA.png": "/images/blog/2024-03-1l_e9DryU6Nv9jJID4uT4jA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1lu6REHML_Rpe1WUZ-LCEAw.png": "/images/blog/2024-03-1lu6REHML_Rpe1WUZ-LCEAw.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1kPZDyeRbrhK6eitqRn_Dow.png": "/images/blog/2024-03-1kPZDyeRbrhK6eitqRn_Dow.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1pANPAEVLXEsb8nrBfIcX7A.png": "/images/blog/2024-03-1pANPAEVLXEsb8nrBfIcX7A.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1nOk7f92hQtOxcabFs9c0kg.jpg": "/images/blog/2024-03-1nOk7f92hQtOxcabFs9c0kg.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1niD8aty4OCDghSDpMBPNhA.jpg": "/images/blog/2024-03-1niD8aty4OCDghSDpMBPNhA.jpg",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1nlCxbl9XpKz-wSEQUlwG8g.png": "/images/blog/2024-03-1nlCxbl9XpKz-wSEQUlwG8g.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1o7jPuL_2nEucOOqzvRxtvQ.png": "/images/blog/2024-03-1o7jPuL_2nEucOOqzvRxtvQ.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1pM4O0Zzy8tpAy0-uvXBqMg.png": "/images/blog/2024-03-1pM4O0Zzy8tpAy0-uvXBqMg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1peGygwAu6dHbdvi2jMXc6w.png": "/images/blog/2024-03-1peGygwAu6dHbdvi2jMXc6w.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1qQAVHxMXHWGJQWp3uWB0vQ.png": "/images/blog/2024-03-1qQAVHxMXHWGJQWp3uWB0vQ.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1rmUbwo3jTjhGWIf_Odx4OA.png": "/images/blog/2024-03-1rmUbwo3jTjhGWIf_Odx4OA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1tdey9hhFG0kElqH0GEW5PA.png": "/images/blog/2024-03-1tdey9hhFG0kElqH0GEW5PA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1uOG1D8zVGjTcpNajeCMupw.png": "/images/blog/2024-03-1uOG1D8zVGjTcpNajeCMupw.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1x9YI9zJhPRBsiwDjzE7VDw.png": "/images/blog/2024-03-1x9YI9zJhPRBsiwDjzE7VDw.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1wchCRBnPrSopa-GI5R-OBA.png": "/images/blog/2024-03-1wchCRBnPrSopa-GI5R-OBA.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1vJQD4BbYpO3JbFbeXaCmyg.png": "/images/blog/2024-03-1vJQD4BbYpO3JbFbeXaCmyg.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1v1li7uMq41kGEbBIr_QH5w.gif": "/images/blog/2024-03-1v1li7uMq41kGEbBIr_QH5w.gif",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1zRYbzDWLNY6QaK1QLrdV5w.png": "/images/blog/2024-03-1zRYbzDWLNY6QaK1QLrdV5w.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1zpdAscQ42KDoiAfwaK4sWw.png": "/images/blog/2024-03-1zpdAscQ42KDoiAfwaK4sWw.png",
        "https://blog.trainerday.com/wp-content/uploads/2024/03/1yrJKN9D3emlVHXX4K6kF-w.png": "/images/blog/2024-03-1yrJKN9D3emlVHXX4K6kF-w.png"
};
        const localPath = imageMapping[originalUrl];
        if (localPath) {
          return match.replace(originalUrl, localPath);
        }
        return match; // Keep original if no local mapping found
      })
      .replace(/src="\/wp-content\//g, 'src="https://blog.trainerday.com/wp-content/')
      // Convert WordPress embeds to proper HTML
      .replace(/\[embed\](.*?)\[\/embed\]/g, function(match, url) {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
          if (videoId) {
            return `<div style="position: relative; padding-bottom: 56.25%; height: 0; margin: 20px 0;">
              <iframe src="https://www.youtube.com/embed/${videoId[1]}" 
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" 
                allowfullscreen></iframe>
            </div>`;
          }
        }
        return `<p><a href="${url}" target="_blank">${url}</a></p>`;
      })
      // Add some basic styling
      .replace(/<h2>/g, '<h2 style="color: #ffffff; font-size: 1.8rem; font-weight: 600; margin: 30px 0 15px 0;">')
      .replace(/<h3>/g, '<h3 style="color: #ffffff; font-size: 1.4rem; font-weight: 600; margin: 25px 0 10px 0;">')
      .replace(/<p>/g, '<p style="color: var(--light-background); line-height: 1.6; margin-bottom: 15px;">')
      .replace(/<ul>/g, '<ul style="color: var(--light-background); line-height: 1.6; margin-bottom: 15px; padding-left: 20px;">')
      .replace(/<ol>/g, '<ol style="color: var(--light-background); line-height: 1.6; margin-bottom: 15px; padding-left: 20px;">')
      .replace(/<li>/g, '<li style="margin-bottom: 5px;">')
      .replace(/<a /g, '<a style="color: var(--primary-red); text-decoration: underline;" ')
      .replace(/<img /g, '<img style="max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0;" ');
    
    // Generate HTML file
    const fileName = url.substring(1) + '.html';
    const filePath = path.join(__dirname, 'public/posts', fileName);
    
    // Generate only clean content (no header/footer, no inline styles)
    const cleanContent = content
      // Remove any existing inline styles since we use CSS classes
      .replace(/style="[^"]*"/g, '')
      // Ensure proper paragraph structure
      .replace(/\n\n/g, '</p><p>')
      .replace(/^([^<])/gm, '<p>$1')
      .replace(/([^>])$/gm, '$1</p>')
      // Clean up any double paragraph tags
      .replace(/<p><p>/g, '<p>')
      .replace(/<\/p><\/p>/g, '</p>')
      // Clean up empty paragraphs
      .replace(/<p>\s*<\/p>/g, '')
      // Fix images to not have inline styles
      .replace(/<img ([^>]*)style="[^"]*"([^>]*)>/g, '<img $1$2>');
    
    // Write the HTML file
    fs.writeFileSync(filePath, cleanContent.trim(), 'utf8');
    publishedCount++;
    
    if (publishedCount <= 5) {
      console.log(`Created: ${fileName}`);
    }
    
  } catch (error) {
    console.error(`Error processing post ${index + 1}:`, error.message);
  }
  
  processedCount++;
});

console.log(`\nProcessing complete!`);
console.log(`Total posts processed: ${processedCount}`);
console.log(`Published posts converted to HTML: ${publishedCount}`);
console.log(`Files created in: ./public/posts/`);
console.log(`\nExample URLs that will work:`);
console.log(`- http://localhost:3000/what-type-of-training-to-do-this-winter-fe8f9287cee2`);
console.log(`- http://localhost:3000/using-trainerday-workouts-in-other-platforms-f927661d8550`);
console.log(`- http://localhost:3000/the-ultimate-way-zone-2-training-cef54a104bee`);