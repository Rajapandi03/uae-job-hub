                                                                                                                                            # UAE JobHub - Scrapers

                                                                                                                                            Automated job scrapers that populate the Supabase database.

                                                                                                                                            ## Setup

                                                                                                                                            ```bash
                                                                                                                                            cd scrapers
                                                                                                                                            pip install -r requirements.txt
                                                                                                                                            ```

                                                                                                                                            ## Environment Variables

                                                                                                                                            Copy `../.env.example` to `../.env` and fill in your keys:

                                                                                                                                            | Variable | Where to get it |
                                                                                                                                            |---|---|
                                                                                                                                            | `SUPABASE_URL` | Supabase Dashboard > Settings > API |
                                                                                                                                            | `SUPABASE_SERVICE_KEY` | Supabase Dashboard > Settings > API > service_role key |
                                                                                                                                            | `GEMINI_API_KEY` | Google AI Studio (optional, for career pages) |

                                                                                                                                            ## Running

                                                                                                                                            ```bash
                                                                                                                                            # Full run (writes to Supabase)
                                                                                                                                            python run_all.py

                                                                                                                                            # Dry run (no DB writes, just prints)
                                                                                                                                            python run_all.py --dry

                                                                                                                                            # Individual scrapers
                                                                                                                                            python jobspy_scraper.py --dry
                                                                                                                                            python scrapling_scraper.py --dry
                                                                                                                                            python career_pages.py --dry
                                                                                                                                            ```

                                                                                                                                            ## Scraper Sources

                                                                                                                                            | Scraper | Sources | Library |
                                                                                                                                            |---|---|---|
                                                                                                                                            | `jobspy_scraper.py` | LinkedIn, Indeed, Google Jobs, Bayt | python-jobspy |
                                                                                                                                            | `scrapling_scraper.py` | Naukrigulf, GulfTalent | Scrapling |
                                                                                                                                            | `career_pages.py` | UAE company career pages | ScrapeGraphAI + Gemini |
