import { notFound } from "next/navigation";
import { getCrmSupabase, type PitchPageData } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function PitchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!process.env.CRM_SUPABASE_URL || !process.env.CRM_SUPABASE_SERVICE_KEY) {
    notFound();
  }

  const supabase = getCrmSupabase();

  const { data, error } = await supabase
    .from("pitch_pages")
    .select("*, lead:leads(*)")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    notFound();
  }

  const pitch = data as PitchPageData;

  // Increment page views (fire and forget)
  supabase
    .from("pitch_pages")
    .update({ page_views: (pitch.page_views || 0) + 1 })
    .eq("id", pitch.id)
    .then();

  // ---------- Resolve data with fallbacks ----------
  const businessName = pitch.lead?.business_name ?? "Your Practice";
  const city = pitch.lead?.city ?? null;
  const state = pitch.lead?.state ?? null;
  const locationLine = [city, state].filter(Boolean).join(", ");
  const address = pitch.lead?.address ?? null;
  const rating =
    pitch.enrichment_data?.rating ?? pitch.lead?.google_rating ?? null;
  const reviewCount =
    pitch.enrichment_data?.review_count ?? pitch.lead?.google_reviews ?? null;
  const estimatedLostRevenue =
    pitch.enrichment_data?.estimated_lost_revenue ?? 12400;
  const topServices = pitch.enrichment_data?.top_services?.length
    ? pitch.enrichment_data.top_services
    : ["Botox", "Dermal Fillers", "Laser Treatments"];
  const primaryService = topServices[0];
  const tagline =
    pitch.enrichment_data?.tagline ??
    (city
      ? `Premium Medical Aesthetics in ${city}`
      : "Premium Medical Aesthetics");
  const logoUrl = pitch.enrichment_data?.logo_url ?? null;
  const heroImageUrl = pitch.enrichment_data?.hero_image_url ?? null;

  // ---------- Brand colors with fallbacks ----------
  const primary = pitch.enrichment_data?.brand_colors?.primary ?? "#8B7355";
  const secondary = pitch.enrichment_data?.brand_colors?.secondary ?? "#C9A96E";
  const bgColor =
    pitch.enrichment_data?.brand_colors?.background ?? "#FDFBF7";

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  // Derived colors
  const textDark = "#2D2A26";
  const textMuted = "#6B6560";
  const textLight = "#9B9590";
  const divider = `${primary}18`;
  const cardBg = "#FFFFFF";
  const softBg = `${primary}08`;

  // ---------- Styles ----------
  const heading: React.CSSProperties = {
    fontFamily: "var(--font-playfair), Georgia, serif",
    fontWeight: 600,
    lineHeight: 1.15,
    letterSpacing: "-0.02em",
    color: textDark,
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: "0.75rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    color: primary,
    marginBottom: "1rem",
    fontWeight: 600,
    fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
  };

  const card: React.CSSProperties = {
    background: cardBg,
    border: `1px solid ${primary}12`,
    borderRadius: "1.25rem",
    padding: "2.5rem 2rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03)",
  };

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "0 1.5rem",
        background: bgColor,
      }}
    >
      {/* ========== SECTION 1 -- HERO ========== */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          position: "relative",
          ...(heroImageUrl
            ? {
                backgroundImage: `linear-gradient(180deg, ${bgColor}E6 0%, ${bgColor}CC 50%, ${bgColor} 100%), url(${heroImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                background: `linear-gradient(180deg, ${primary}08 0%, ${bgColor} 60%)`,
              }),
        }}
      >
        {/* Logo if available */}
        {logoUrl && (
          <img
            src={logoUrl}
            alt={businessName}
            style={{
              maxHeight: "60px",
              maxWidth: "200px",
              marginBottom: "2rem",
              objectFit: "contain",
            }}
          />
        )}

        <h1
          style={{
            ...heading,
            fontSize: "clamp(2.4rem, 6vw, 4.5rem)",
            margin: 0,
            color: textDark,
          }}
        >
          {businessName}
        </h1>

        <p
          style={{
            marginTop: "1.25rem",
            fontSize: "1.2rem",
            color: textMuted,
            fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            fontWeight: 400,
            maxWidth: "500px",
            lineHeight: 1.6,
          }}
        >
          {tagline}
        </p>

        {/* Decorative accent line */}
        <div
          style={{
            width: "60px",
            height: "2px",
            background: `linear-gradient(90deg, ${primary}, ${secondary})`,
            margin: "2rem auto 0",
            borderRadius: "1px",
          }}
        />

        {/* Scroll indicator */}
        <div
          style={{
            position: "absolute",
            bottom: "2.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            color: textLight,
            fontSize: "0.7rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          <span>Scroll</span>
          <div
            style={{
              width: "1px",
              height: "32px",
              background: `linear-gradient(to bottom, ${primary}, transparent)`,
              animation: "scrollPulse 2s ease-in-out infinite",
            }}
          />
        </div>

        <style>{`
          @keyframes scrollPulse {
            0%, 100% { opacity: 0.4; transform: scaleY(1); }
            50% { opacity: 1; transform: scaleY(1.2); }
          }
        `}</style>
      </section>

      {/* ========== SECTION 2 -- YOUR PRACTICE AT A GLANCE ========== */}
      <section style={{ padding: "6rem 0" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <p style={sectionLabel}>Your Practice at a Glance</p>
          <h2
            style={{
              ...heading,
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              marginTop: 0,
              marginBottom: "0.75rem",
            }}
          >
            We Did Our Research
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              color: textMuted,
              maxWidth: "520px",
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Here is what we know about {businessName}.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {/* Rating Card */}
          {rating && (
            <div style={card}>
              <p
                style={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: textLight,
                  marginTop: 0,
                  marginBottom: "0.75rem",
                  fontWeight: 600,
                }}
              >
                Google Rating
              </p>
              <p
                style={{
                  ...heading,
                  fontSize: "3rem",
                  color: primary,
                  margin: 0,
                }}
              >
                {rating}{" "}
                <span style={{ fontSize: "1.5rem", color: secondary }}>
                  &#9733;
                </span>
              </p>
              {reviewCount && (
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: textMuted,
                    marginTop: "0.5rem",
                    marginBottom: 0,
                  }}
                >
                  Based on {fmt(reviewCount)} reviews
                </p>
              )}
            </div>
          )}

          {/* Location Card */}
          {(address || locationLine) && (
            <div style={card}>
              <p
                style={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: textLight,
                  marginTop: 0,
                  marginBottom: "0.75rem",
                  fontWeight: 600,
                }}
              >
                Location
              </p>
              {address && (
                <p
                  style={{
                    fontSize: "1.1rem",
                    color: textDark,
                    margin: 0,
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  {address}
                </p>
              )}
              {locationLine && (
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: textMuted,
                    marginTop: "0.35rem",
                    marginBottom: 0,
                  }}
                >
                  {locationLine}
                </p>
              )}
            </div>
          )}

          {/* Services Card */}
          <div
            style={{
              ...card,
              gridColumn:
                !rating && !(address || locationLine)
                  ? "1 / -1"
                  : undefined,
            }}
          >
            <p
              style={{
                fontSize: "0.75rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: textLight,
                marginTop: 0,
                marginBottom: "1rem",
                fontWeight: 600,
              }}
            >
              Services Offered
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              {topServices.map((service, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    padding: "0.45rem 1rem",
                    background: `${primary}10`,
                    color: primary,
                    borderRadius: "100px",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    border: `1px solid ${primary}20`,
                  }}
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 3 -- THE OPPORTUNITY ========== */}
      <section style={{ padding: "6rem 0" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <p style={sectionLabel}>The Opportunity</p>
          <h2
            style={{
              ...heading,
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              marginTop: 0,
              marginBottom: "1.5rem",
            }}
          >
            We Noticed an Opportunity to Help{" "}
            <span style={{ color: primary }}>{businessName}</span> Capture More
            Revenue
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.75,
              color: textMuted,
              marginBottom: "3rem",
            }}
          >
            Your online presence shows a thriving practice
            {reviewCount ? ` with ${fmt(reviewCount)} reviews` : ""}
            {rating ? ` at ${rating} stars` : ""}. But even top-performing med
            spas are leaving significant revenue on the table due to one thing:
            response time.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem",
            }}
          >
            <div
              style={{
                ...card,
                background: softBg,
                borderColor: `${primary}15`,
              }}
            >
              <p
                style={{
                  ...heading,
                  fontSize: "2.5rem",
                  color: primary,
                  margin: 0,
                }}
              >
                78%
              </p>
              <p
                style={{
                  fontSize: "0.95rem",
                  color: textMuted,
                  lineHeight: 1.6,
                  marginTop: "0.75rem",
                  marginBottom: 0,
                }}
              >
                of patients choose the first practice to respond to their
                inquiry
              </p>
            </div>

            <div
              style={{
                ...card,
                background: softBg,
                borderColor: `${primary}15`,
              }}
            >
              <p
                style={{
                  ...heading,
                  fontSize: "2.5rem",
                  color: primary,
                  margin: 0,
                }}
              >
                ${fmt(estimatedLostRevenue)}
                <span style={{ fontSize: "1rem", color: textMuted }}>
                  /month
                </span>
              </p>
              <p
                style={{
                  fontSize: "0.95rem",
                  color: textMuted,
                  lineHeight: 1.6,
                  marginTop: "0.75rem",
                  marginBottom: 0,
                }}
              >
                estimated missed revenue from delayed lead response
              </p>
            </div>

            <div
              style={{
                ...card,
                background: softBg,
                borderColor: `${primary}15`,
              }}
            >
              <p
                style={{
                  ...heading,
                  fontSize: "2.5rem",
                  color: primary,
                  margin: 0,
                }}
              >
                47 min
              </p>
              <p
                style={{
                  fontSize: "0.95rem",
                  color: textMuted,
                  lineHeight: 1.6,
                  marginTop: "0.75rem",
                  marginBottom: 0,
                }}
              >
                your current estimated response time (industry average)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 4 -- WHAT WE BUILT FOR YOU ========== */}
      <section style={{ padding: "6rem 0" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <p style={sectionLabel}>What We Built for You</p>
          <h2
            style={{
              ...heading,
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              marginTop: 0,
              marginBottom: "1.5rem",
            }}
          >
            We Put Together a Custom Solution for{" "}
            <span style={{ color: primary }}>{businessName}</span>
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.75,
              color: textMuted,
              marginBottom: "2.5rem",
            }}
          >
            Imagine a patient texts about{" "}
            <span style={{ color: textDark, fontWeight: 600 }}>
              {primaryService}
            </span>{" "}
            at 9pm on a Saturday. Your front desk is closed. Here is exactly
            what happens with your custom AI receptionist:
          </p>

          {/* Three step visual */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.5rem",
              position: "relative",
            }}
          >
            {/* Connecting line (desktop) */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "3.25rem",
                left: "18%",
                right: "18%",
                height: "1px",
                background: `linear-gradient(90deg, transparent, ${primary}30, ${primary}30, transparent)`,
                zIndex: 0,
              }}
            />

            {[
              {
                step: "01",
                title: "Patient reaches out",
                desc: `A prospective patient texts or calls about ${primaryService} after hours`,
              },
              {
                step: "02",
                title: "AI responds in < 60s",
                desc: "Your AI receptionist answers their questions about pricing, prep, and availability",
              },
              {
                step: "03",
                title: "Appointment booked",
                desc: "The patient is booked for their next available slot — automatically",
              },
            ].map(({ step, title, desc }, i) => (
              <div
                key={i}
                style={{
                  ...card,
                  textAlign: "center",
                  zIndex: 1,
                  padding: "2rem 1.5rem",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${primary}15, ${primary}08)`,
                    border: `1px solid ${primary}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.25rem",
                  }}
                >
                  <span
                    style={{
                      ...heading,
                      fontSize: "1rem",
                      color: primary,
                    }}
                  >
                    {step}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "1.05rem",
                    lineHeight: 1.4,
                    color: textDark,
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                    color: textMuted,
                  }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {/* Subtle VelosLuxe introduction */}
          <div
            style={{
              marginTop: "3rem",
              padding: "2rem",
              background: softBg,
              borderRadius: "1rem",
              border: `1px solid ${primary}12`,
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "1rem",
                lineHeight: 1.7,
                color: textMuted,
              }}
            >
              Powered by{" "}
              <a
                href="https://velosluxe.com"
                style={{
                  color: primary,
                  fontWeight: 600,
                  textDecoration: "none",
                  borderBottom: `1px solid ${primary}40`,
                }}
              >
                VelosLuxe
              </a>{" "}
              &mdash; an AI receptionist built specifically for medical
              aesthetics practices. It handles calls, texts, emails, and booking
              24/7.
            </p>
          </div>
        </div>
      </section>

      {/* ========== SECTION 5 -- THE NUMBERS ========== */}
      <section style={{ padding: "6rem 0" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <p style={{ ...sectionLabel, textAlign: "center" }}>The Numbers</p>
          <h2
            style={{
              ...heading,
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              marginTop: 0,
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            Your Projected ROI
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              color: textMuted,
              textAlign: "center",
              maxWidth: "500px",
              margin: "0 auto 3rem",
              lineHeight: 1.7,
            }}
          >
            Based on your{" "}
            {reviewCount ? `${fmt(reviewCount)} Google reviews` : "practice profile"}{" "}
            and service volume, we estimate:
          </p>

          <div
            style={{
              ...card,
              padding: 0,
              overflow: "hidden",
            }}
          >
            {[
              {
                label: "Revenue Recovered",
                before: "Currently losing",
                beforeVal: `$${fmt(estimatedLostRevenue)}/mo`,
                after: "Recovered with AI",
                afterVal: `$${fmt(Math.round(estimatedLostRevenue * 0.7))}/mo`,
              },
              {
                label: "No-Show Rate",
                before: "Industry average",
                beforeVal: "~20-30%",
                after: "With automated reminders",
                afterVal: "~8-12%",
              },
              {
                label: "Response Time",
                before: "Current estimate",
                beforeVal: "47 minutes",
                after: "With AI receptionist",
                afterVal: "Under 60 seconds",
              },
            ].map(({ label, before, beforeVal, after, afterVal }, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  borderBottom:
                    i < 2 ? `1px solid ${primary}10` : "none",
                }}
              >
                <div
                  style={{
                    padding: "1.75rem 2rem",
                    borderRight: `1px solid ${primary}10`,
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.7rem",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: textLight,
                      marginTop: 0,
                      marginBottom: "0.15rem",
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: textLight,
                      marginTop: 0,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {before}
                  </p>
                  <p
                    style={{
                      ...heading,
                      fontSize: "1.4rem",
                      color: textMuted,
                      margin: 0,
                    }}
                  >
                    {beforeVal}
                  </p>
                </div>
                <div
                  style={{
                    padding: "1.75rem 2rem",
                    background: `${primary}06`,
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.7rem",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: textLight,
                      marginTop: 0,
                      marginBottom: "0.65rem",
                      fontWeight: 600,
                    }}
                  >
                    &nbsp;
                  </p>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: primary,
                      marginTop: 0,
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                    }}
                  >
                    {after}
                  </p>
                  <p
                    style={{
                      ...heading,
                      fontSize: "1.4rem",
                      color: primary,
                      margin: 0,
                    }}
                  >
                    {afterVal}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== SECTION 6 -- CTA ========== */}
      <section
        style={{
          padding: "6rem 0",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: "640px",
            margin: "0 auto",
            padding: "4rem 2.5rem",
            background: `linear-gradient(135deg, ${primary}08, ${secondary}08)`,
            borderRadius: "1.5rem",
            border: `1px solid ${primary}15`,
          }}
        >
          <h2
            style={{
              ...heading,
              fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
              marginTop: 0,
              marginBottom: "1rem",
            }}
          >
            Want to See This in Action
            <br />
            for <span style={{ color: primary }}>{businessName}</span>?
          </h2>

          <p
            style={{
              fontSize: "1.05rem",
              color: textMuted,
              marginTop: 0,
              marginBottom: "2rem",
              lineHeight: 1.6,
            }}
          >
            15-minute walkthrough. No contracts. No pressure.
          </p>

          <a
            href="https://velosluxe.com/book.html"
            style={{
              display: "inline-block",
              padding: "1rem 2.5rem",
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: "1rem",
              borderRadius: "100px",
              textDecoration: "none",
              letterSpacing: "0.02em",
              boxShadow: `0 4px 16px ${primary}30, 0 1px 3px rgba(0,0,0,0.1)`,
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
          >
            Book Your Free Walkthrough
          </a>

          <p
            style={{
              marginTop: "2rem",
              marginBottom: "0.5rem",
              fontSize: "1rem",
              color: primary,
              fontWeight: 600,
              letterSpacing: "0.03em",
            }}
          >
            (855) VELOS-AI
          </p>

          <p
            style={{
              margin: 0,
              marginTop: "1.5rem",
              fontSize: "0.8rem",
              color: textLight,
            }}
          >
            Prepared by{" "}
            <a
              href="https://velosluxe.com"
              style={{
                color: textLight,
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              VelosLuxe
            </a>
          </p>
        </div>
      </section>

      {/* ========== SECTION 7 -- FOOTER ========== */}
      <footer
        style={{
          padding: "3rem 0 2.5rem",
          textAlign: "center",
          borderTop: `1px solid ${primary}10`,
        }}
      >
        <p
          style={{
            fontSize: "0.8rem",
            color: textLight,
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          Prepared exclusively for {businessName} by{" "}
          <a
            href="https://velosluxe.com"
            style={{
              color: textMuted,
              textDecoration: "none",
              fontWeight: 500,
              borderBottom: `1px solid ${primary}30`,
            }}
          >
            VelosLuxe
          </a>
        </p>
      </footer>
    </main>
  );
}
