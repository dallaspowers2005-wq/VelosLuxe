/**
 * Blog routes for VelosLuxe SEO
 */

function blogLayout(title, metaDesc, bodyHtml, canonicalPath) {
  return '<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'  <title>' + escHtml(title) + ' — VelosLuxe</title>' +
'  <meta name="description" content="' + escHtml(metaDesc || '') + '">' +
'  <link rel="canonical" href="https://velosluxe.com' + canonicalPath + '">' +
'  <meta property="og:title" content="' + escHtml(title) + ' — VelosLuxe">' +
'  <meta property="og:description" content="' + escHtml(metaDesc || '') + '">' +
'  <meta property="og:type" content="article">' +
'  <meta property="og:url" content="https://velosluxe.com' + canonicalPath + '">' +
'  <meta name="twitter:card" content="summary_large_image">' +
'  <link rel="preconnect" href="https://fonts.googleapis.com">' +
'  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
'  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">' +
'  <style>' +
BLOG_CSS +
'  </style>' +
'</head>' +
'<body>' +
'  <nav class="topbar">' +
'    <a href="/" class="logo">VELOS<span>LUXE</span></a>' +
'    <div class="topbar-nav">' +
'      <a href="/blog">Blog</a>' +
'      <a href="/#how-it-works">How It Works</a>' +
'      <a href="/quiz" class="topbar-cta">Free Growth Score</a>' +
'    </div>' +
'  </nav>' +
bodyHtml +
'  <footer class="blog-footer">' +
'    <p>&copy; ' + new Date().getFullYear() + ' VelosLuxe. All rights reserved. | <a href="/privacy">Privacy</a> | <a href="/terms">Terms</a></p>' +
'  </footer>' +
'</body></html>';
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const BLOG_CSS = `
    :root {
      --bg: #050508; --bg-raised: #0c0c14; --bg-card: #0f0f1a;
      --border: rgba(255,255,255,.08); --border-hover: rgba(255,255,255,.15);
      --text: #b8b5c6; --text-bright: #f2f1f5;
      --gold: #c9a46c; --gold-light: #e2c99b;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-serif: 'Playfair Display', Georgia, serif;
    }
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--text); font-family: var(--font-sans); font-size: 16px; line-height: 1.7; -webkit-font-smoothing: antialiased; }
    h1, h2, h3, h4 { color: var(--text-bright); line-height: 1.2; }
    a { color: var(--gold); text-decoration: none; }
    a:hover { color: var(--gold-light); }
    .wrap { max-width: 800px; margin: 0 auto; padding: 0 1.5rem; }
    .wide-wrap { max-width: 1140px; margin: 0 auto; padding: 0 1.5rem; }
    .topbar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 1rem 2.5rem; background: rgba(5,5,8,.85); backdrop-filter: blur(30px); border-bottom: 1px solid var(--border); }
    .logo { font-family: var(--font-sans); font-size: 1rem; font-weight: 700; letter-spacing: .18em; color: var(--text-bright); text-decoration: none; }
    .logo span { color: var(--gold); }
    .topbar-nav { display: flex; gap: 2rem; align-items: center; }
    .topbar-nav a { color: var(--text); font-size: .82rem; font-weight: 500; transition: color .2s; }
    .topbar-nav a:hover { color: var(--text-bright); }
    .topbar-cta { font-size: .78rem; font-weight: 600; padding: .6rem 1.6rem; border-radius: 100px; background: var(--gold); color: var(--bg); transition: all .25s; }
    .topbar-cta:hover { background: var(--gold-light); }
    .article-header { padding: 8rem 0 3rem; text-align: center; }
    .article-header h1 { font-family: var(--font-serif); font-size: 2.8rem; margin-bottom: 1rem; }
    .article-meta { font-size: .85rem; color: var(--text); margin-bottom: .5rem; }
    .article-category { display: inline-block; font-size: .7rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--gold); background: rgba(201,164,108,.1); padding: .3rem .8rem; border-radius: 100px; border: 1px solid rgba(201,164,108,.2); }
    .article-body { padding: 0 0 5rem; }
    .article-body h2 { font-family: var(--font-serif); font-size: 1.6rem; margin: 2.5rem 0 1rem; }
    .article-body h3 { font-size: 1.2rem; margin: 2rem 0 .8rem; }
    .article-body p { margin-bottom: 1.2rem; }
    .article-body ul, .article-body ol { margin-bottom: 1.2rem; padding-left: 1.5rem; }
    .article-body li { margin-bottom: .5rem; }
    .article-body blockquote { border-left: 3px solid var(--gold); padding: 1rem 1.5rem; margin: 1.5rem 0; background: var(--bg-raised); border-radius: 0 8px 8px 0; font-style: italic; }
    .article-body strong { color: var(--text-bright); }
    .blog-header { padding: 8rem 0 3rem; text-align: center; }
    .blog-header h1 { font-family: var(--font-serif); font-size: 3rem; margin-bottom: .5rem; }
    .blog-header p { font-size: 1.1rem; max-width: 600px; margin: 0 auto; }
    .blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; padding-bottom: 4rem; }
    .blog-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 1.8rem; transition: all .3s; }
    .blog-card:hover { border-color: var(--border-hover); transform: translateY(-2px); }
    .blog-card h3 { font-size: 1.15rem; margin-bottom: .6rem; }
    .blog-card h3 a { color: var(--text-bright); }
    .blog-card h3 a:hover { color: var(--gold); }
    .blog-card p { font-size: .9rem; color: var(--text); margin-bottom: .8rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .blog-card-meta { font-size: .75rem; color: rgba(184,181,198,.6); display: flex; justify-content: space-between; align-items: center; }
    .pagination { display: flex; justify-content: center; gap: .5rem; padding: 2rem 0 5rem; flex-wrap: wrap; }
    .pagination a, .pagination span { display: inline-block; padding: .5rem 1rem; border-radius: 8px; font-size: .85rem; font-weight: 500; }
    .pagination a { background: var(--bg-card); border: 1px solid var(--border); color: var(--text); }
    .pagination a:hover { border-color: var(--gold); color: var(--gold); }
    .pagination .current { background: var(--gold); color: var(--bg); }
    .blog-cta { text-align: center; padding: 4rem 2rem; margin: 3rem 0; background: var(--bg-raised); border: 1px solid var(--border); border-radius: 16px; }
    .blog-cta h2 { font-family: var(--font-serif); font-size: 1.8rem; margin-bottom: .8rem; }
    .blog-cta p { margin-bottom: 1.5rem; max-width: 500px; margin-left: auto; margin-right: auto; }
    .blog-cta a.btn { display: inline-block; padding: .8rem 2rem; border-radius: 100px; background: var(--gold); color: var(--bg); font-weight: 600; font-size: .9rem; }
    .blog-footer { text-align: center; padding: 2rem; border-top: 1px solid var(--border); font-size: .8rem; color: rgba(184,181,198,.5); }
    @media (max-width: 600px) {
      .article-header h1 { font-size: 1.8rem; }
      .blog-header h1 { font-size: 2rem; }
      .blog-grid { grid-template-columns: 1fr; }
      .topbar { padding: .8rem 1.2rem; }
      .topbar-nav { gap: 1rem; }
    }
`;

function setupBlogRoutes(app, getAll, getOne, runQuery, insertAndGetId, saveDb) {

  // Blog index with pagination
  app.get('/blog', function(req, res) {
    var page = Math.max(1, parseInt(req.query.page) || 1);
    var perPage = 24;
    var pgOffset = (page - 1) * perPage;

    var totalRow = getOne("SELECT COUNT(*) as count FROM blog_posts WHERE published = 1");
    var total = totalRow ? totalRow.count : 0;
    var totalPages = Math.ceil(total / perPage);

    var posts = getAll(
      "SELECT slug, title, meta_description, category, created_at FROM blog_posts WHERE published = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [perPage, pgOffset]
    );

    var cardsHtml = '';
    for (var i = 0; i < posts.length; i++) {
      var p = posts[i];
      var date = new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      var cat = (p.category || 'general').replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
      cardsHtml += '<div class="blog-card">' +
        '<h3><a href="/blog/' + escHtml(p.slug) + '">' + escHtml(p.title) + '</a></h3>' +
        '<p>' + escHtml(p.meta_description || '') + '</p>' +
        '<div class="blog-card-meta"><span class="article-category">' + escHtml(cat) + '</span><span>' + date + '</span></div>' +
        '</div>';
    }

    var paginationHtml = '';
    if (totalPages > 1) {
      paginationHtml = '<div class="pagination">';
      if (page > 1) paginationHtml += '<a href="/blog?page=' + (page - 1) + '">&larr; Prev</a>';

      // Show smart pagination
      var start = Math.max(1, page - 4);
      var end = Math.min(totalPages, start + 9);
      if (start > 1) paginationHtml += '<a href="/blog?page=1">1</a><span>...</span>';
      for (var j = start; j <= end; j++) {
        if (j === page) paginationHtml += '<span class="current">' + j + '</span>';
        else paginationHtml += '<a href="/blog?page=' + j + '">' + j + '</a>';
      }
      if (end < totalPages) paginationHtml += '<span>...</span><a href="/blog?page=' + totalPages + '">' + totalPages + '</a>';
      if (page < totalPages) paginationHtml += '<a href="/blog?page=' + (page + 1) + '">Next &rarr;</a>';
      paginationHtml += '</div>';
    }

    var body = '<div class="blog-header"><div class="wrap">' +
      '<h1>The Med Spa Growth Blog</h1>' +
      '<p>Insights on AI, automation, and growth strategies for medical spas and aesthetic clinics.</p>' +
      '</div></div>' +
      '<div class="wide-wrap">' +
      '<div class="blog-grid">' + cardsHtml + '</div>' +
      paginationHtml +
      '</div>';

    res.send(blogLayout('Med Spa Growth Blog', 'Expert insights on AI receptionists, lead response automation, and growth strategies for medical spas.', body, '/blog'));
  });

  // Individual blog post
  app.get('/blog/:slug', function(req, res, next) {
    var post = getOne("SELECT * FROM blog_posts WHERE slug = ? AND published = 1", [req.params.slug]);
    if (!post) return next();

    var date = new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    var cat = (post.category || 'general').replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });

    var body = '<div class="article-header"><div class="wrap">' +
      '<div class="article-meta">' + date + '</div>' +
      '<h1>' + escHtml(post.title) + '</h1>' +
      '<div style="margin-top: 1rem;"><span class="article-category">' + escHtml(cat) + '</span></div>' +
      '</div></div>' +
      '<div class="wrap article-body">' +
      post.content +
      '<div class="blog-cta">' +
      '<h2>Ready to Never Miss a Lead Again?</h2>' +
      '<p>See how VelosLuxe\'s AI receptionist can recover thousands in lost revenue for your med spa.</p>' +
      '<a href="/quiz" class="btn">Get Your Free Growth Score</a>' +
      '</div></div>';

    res.send(blogLayout(post.title, post.meta_description, body, '/blog/' + post.slug));
  });

  // Blog sitemap
  app.get('/blog-sitemap.xml', function(req, res) {
    var posts = getAll("SELECT slug, updated_at, created_at FROM blog_posts WHERE published = 1 ORDER BY created_at DESC");
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += '<url><loc>https://velosluxe.com/blog</loc><changefreq>daily</changefreq><priority>0.8</priority></url>\n';
    for (var k = 0; k < posts.length; k++) {
      var p = posts[k];
      xml += '<url><loc>https://velosluxe.com/blog/' + p.slug + '</loc><lastmod>' + (p.updated_at || p.created_at).substring(0, 10) + '</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n';
    }
    xml += '</urlset>';
    res.set('Content-Type', 'application/xml').send(xml);
  });

  // API to insert blog posts (admin only)
  app.post('/api/blog/posts', function(req, res) {
    var adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });

    var slug = req.body.slug;
    var title = req.body.title;
    var content = req.body.content;
    var meta_description = req.body.meta_description;
    var category = req.body.category;
    var tags = req.body.tags;

    if (!slug || !title || !content) return res.status(400).json({ error: 'slug, title, content required' });

    try {
      var existing = getOne("SELECT id FROM blog_posts WHERE slug = ?", [slug]);
      if (existing) {
        runQuery("UPDATE blog_posts SET title = ?, meta_description = ?, content = ?, category = ?, tags = ?, updated_at = datetime('now') WHERE slug = ?",
          [title, meta_description || '', content, category || 'general', JSON.stringify(tags || []), slug]);
        return res.json({ updated: true, slug: slug });
      }
      var id = insertAndGetId(
        "INSERT INTO blog_posts (slug, title, meta_description, content, category, tags) VALUES (?, ?, ?, ?, ?, ?)",
        [slug, title, meta_description || '', content, category || 'general', JSON.stringify(tags || [])]
      );
      saveDb();
      res.json({ created: true, id: id, slug: slug });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk insert endpoint
  app.post('/api/blog/posts/bulk', function(req, res) {
    var adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });

    var posts = req.body.posts;
    if (!Array.isArray(posts)) return res.status(400).json({ error: 'posts array required' });

    var created = 0, skipped = 0;
    for (var m = 0; m < posts.length; m++) {
      var p = posts[m];
      if (!p.slug || !p.title || !p.content) { skipped++; continue; }
      try {
        var existing = getOne("SELECT id FROM blog_posts WHERE slug = ?", [p.slug]);
        if (existing) { skipped++; continue; }
        insertAndGetId(
          "INSERT INTO blog_posts (slug, title, meta_description, content, category, tags) VALUES (?, ?, ?, ?, ?, ?)",
          [p.slug, p.title, p.meta_description || '', p.content, p.category || 'general', JSON.stringify(p.tags || [])]
        );
        created++;
      } catch (e) { skipped++; }
    }
    saveDb();
    res.json({ created: created, skipped: skipped, total: posts.length });
  });
}

module.exports = { setupBlogRoutes };
