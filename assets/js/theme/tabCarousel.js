import Splide from '@splidejs/splide';

// Implement Slider
class SplideSlider extends HTMLElement {
    constructor() {
        super();

        this.carouselElement = this;

        this.desktopPerPage = this.carouselElement.dataset.desktopperpage || 4;
        this.mobilePerPage = this.carouselElement.dataset.mobileperpage || 2;
        this.type = this.carouselElement.dataset.type || 'loop';
        this.gap = parseInt(this.carouselElement.dataset.gapbetweenslides, 10) || 0;
        this.padding = this.carouselElement.dataset.padding ? JSON.parse(this.carouselElement.dataset.padding) : 0;
        this.interval = this.carouselElement.dataset.interval || 1000;

        this.showarrows = this.carouselElement.dataset.showarrows === 'true' || false;
        this.autoplay = this.carouselElement.dataset.autoplay === 'true' || false;
        this.showdots = this.carouselElement.dataset.showdots === 'true' || false;

        this.initSlider();
    }

    initSlider() {
        new Splide(this, {
            perPage: this.desktopPerPage,
            perMove: this.desktopPerPage,
            type: this.type,
            padding: this.padding,
            autoplay: this.autoplay,
            interval: this.interval,
            gap: this.gap,
            arrows: this.showarrows,
            pagination: this.showdots,
            start: 0,
            breakpoints: {
                767: {
                    perPage: this.mobilePerPage,
                    perMove: this.mobilePerPage,
                },
            },
        }).mount();
    }
}

// Implement Tabs
class TabCarousel extends HTMLElement {
    constructor() {
        super();

        this.tabs = this.querySelectorAll('[role="tab"]');
        this.tabPanels = this.querySelectorAll('[role="tabpanel"]');
        this.productTemplate = this.querySelector('#product_template');
        this.token = this.dataset.token;

        this.setActiveTab = this.dataset.setactivetab;
        this.numberOftabs = this.dataset.numberoftabs;

        // Handling that if the number of tabs are available for active tab if not then
        // Show the initial tabs
        if (this.numberOftabs < this.setActiveTab) {
            this.setActiveTab = 0;
        }

        this.init();
    }

    init() {
        // handle clicks on tabs
        this.tabs.forEach(tab => {
            tab.addEventListener('click', event => {
                event.preventDefault();
                this.activateTab(tab);
            });

            // handle keyboard events on tabs
            tab.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.activateTab(tab);
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    const index = Array.from(this.tabs).indexOf(event.target);
                    const direction = event.key === 'ArrowLeft' ? -1 : 1;
                    const newIndex = (index + direction + this.tabs.length) % this.tabs.length;
                    this.tabs[newIndex].focus();
                }
            });
        });

        this.activateTab(this.tabs[parseInt(this.setActiveTab, 10)]);
    }

    appendProductItems(data, panel) {
        let productItems = '';

        // Create a data object with the values to insert into the template
        const productData = data.data.site.route.node.products.edges || [];

        // Use a regular expression to replace the placeholders in the template with the actual values
        productData.forEach(element => {
            productItems += this.productTemplate.innerHTML.replace(/{(\w+)}/g, (match, key) => {
                if (key === 'defaultImage') {
                    return element.node[key].url;
                } else if (key === 'prices') {
                    return `${element.node[key].price?.currencyCode} ${element.node[key].price?.value}` || null;
                }
                return element.node[key];
            });
        });

        // eslint-disable-next-line no-param-reassign
        panel.innerHTML = `
        <splide-slider data-gapbetweenslides=6 data-showarrows=true data-showdots=true class="splide" aria-label="Our range of products Sliders">
          <div class="splide__track">
            <ul class="splide__list">
              ${productItems}
            </ul>
          </div>
        </splide-slider>
        `;
    }

    // Pulling Product on request to avoid initial lag
    getCollectionProducts(collectionURL, panel) {
        // if the panel have updated product no need to call the fetch product again
        if (panel.querySelector('splide-slider')) {
            return;
        }

        // Using Graphql to fetch the product dynamically
        fetch('/graphql', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.token}`,
            },
            body: JSON.stringify({
                query: `query CategoryByUrl {
              site {
                route(path: "${collectionURL}") {
                  node {
                    ... on Category {
                      name
                      products {
                        edges {
                          node {
                            entityId
                            name
                            path
                            addToCartUrl
                            defaultImage {
                              url(width: 300)
                            }
                            prices {
                              price {
                                ...PriceFields
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            fragment PriceFields on Money {
              value
              currencyCode
            }`,
            }),
        })
            .then(res => res.json())
            .then(data => {
                // Display the data into the panel
                this.appendProductItems(data, panel);
            })
            .catch(error => console.error(error));
    }

    activateTab(tab) {
        // deactivate all tabs
        this.tabs.forEach(tabItem => {
            tabItem.setAttribute('aria-selected', false);
            tabItem.classList.remove('tab-active');
            tabItem.setAttribute('tabindex', -1);
        });

        // activate the selected tab
        tab.setAttribute('aria-selected', true);
        tab.classList.add('tab-active');
        tab.setAttribute('tabindex', 0);
        tab.focus();

        // hide all tab panels
        this.tabPanels.forEach(panelItem => {
            // eslint-disable-next-line no-param-reassign
            panelItem.hidden = true;
        });

        // show the selected tab panel
        const panel = this.querySelector(`#${tab.getAttribute('aria-controls')}`);
        panel.hidden = false;
        if (panel && panel.getAttribute('data-collectionurl')) {
            this.getCollectionProducts(panel.getAttribute('data-collectionurl'), panel);
        }
    }
}


export default function () {
    // Register the custom components
    customElements.define('splide-slider', SplideSlider);
    customElements.define('tab-carousel', TabCarousel);
}
