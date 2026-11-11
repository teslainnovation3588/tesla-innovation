(function () {
'use strict';

const SUPABASE_URL =
'https://dnmktpmvjzsxzmgizdcv.supabase.co';

const SUPABASE_KEY =
'sb_publishable_80ZPvReXfDaw0UhD872X4Q_Vz2xcrbj';

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const RETURN_KEY = 'tesla_pending_customer_action';

const protectedPages = [
    'purchase.html',
    'negotiate.html',
    'enquiry.html',
    'contact.html'
];

const currentPage =
    window.location.pathname.split('/').pop() || 'index.html';


async function getCustomer() {

    const { data, error } = await db.auth.getUser();

    if (error) return null;

    return data.user || null;

}


function saveReturnPath(path) {

    const target = new URL(path, window.location.origin);

    if (target.origin !== window.location.origin) {
        return;
    }

    localStorage.setItem(
        RETURN_KEY,
        target.pathname + target.search + target.hash
    );

}


function sendToLogin(returnPath) {

    saveReturnPath(returnPath);

    window.location.href =
        'customer.html?returnTo=' +
        encodeURIComponent(returnPath);

}


async function protectCurrentPage() {

    if (!protectedPages.includes(currentPage)) {
        return;
    }

    document.documentElement.style.visibility = 'hidden';

    const user = await getCustomer();

    if (!user) {

        const destination =
            window.location.pathname +
            window.location.search +
            window.location.hash;

        sendToLogin(destination);

        return;

    }

    document.documentElement.style.visibility = 'visible';

}


// Protect purchase, negotiation and enquiry pages.

protectCurrentPage();


// Protect actions embedded on the public homepage.

const bypassClicks = new WeakSet();

document.addEventListener('click', async function(event) {

    const link = event.target.closest(
        'a[href="#negotiation"],' +
        'a[href="#order"],' +
        '#liveChatLauncher,' +
        '#chatLauncher'
    );

    if (!link) return;

    if (bypassClicks.has(link)) {
        bypassClicks.delete(link);
        return;
    }

    if (
        currentPage !== 'index.html' &&
        currentPage !== ''
    ) {
        return;
    }

    event.preventDefault();

    const user = await getCustomer();

    if (!user) {

        let destination = window.location.pathname;

        if (link.matches('#liveChatLauncher, #chatLauncher')) {
            destination += '#livechat';
        } else {
            destination += link.getAttribute('href');
        }

        sendToLogin(destination);

        return;

    }

    if (link.matches('#liveChatLauncher, #chatLauncher')) {

        bypassClicks.add(link);

        link.click();

        return;

    }

    window.location.hash = link.getAttribute('href');

}, true);


// Protect forms on the homepage.

const protectedForms = [
    'negotiationForm',
    'orderForm'
];

const bypassForms = new WeakSet();

document.addEventListener('submit', async function(event) {

    const form = event.target;

    if (!protectedForms.includes(form.id)) {
        return;
    }

    if (bypassForms.has(form)) {
        bypassForms.delete(form);
        return;
    }

    event.preventDefault();

    const user = await getCustomer();

    if (!user) {

        const destination =
            window.location.pathname +
            (form.id === 'negotiationForm'
                ? '#negotiation'
                : '#order');

        sendToLogin(destination);

        return;

    }

    bypassForms.add(form);

    form.requestSubmit();

}, true);


// Return customers to their pending action after login.

async function restorePendingAction() {

    if (currentPage === 'customer.html') {

        const user = await getCustomer();

        if (!user) return;

        const pending =
            localStorage.getItem(RETURN_KEY);

        if (!pending) return;

        localStorage.removeItem(RETURN_KEY);

        const target = new URL(
            pending,
            window.location.origin
        );

        if (target.origin === window.location.origin) {

            window.location.replace(
                target.pathname +
                target.search +
                target.hash
            );

        }

        return;

    }


    // After email verification, restore the requested action.

    const user = await getCustomer();

    if (!user) return;

    const pending =
        localStorage.getItem(RETURN_KEY);

    if (!pending) return;

    localStorage.removeItem(RETURN_KEY);

    const target = new URL(
        pending,
        window.location.origin
    );

    if (target.origin === window.location.origin) {

        window.location.replace(
            target.pathname +
            target.search +
            target.hash
        );

    }

}


restorePendingAction();


// Recheck after successful authentication.

db.auth.onAuthStateChange(function(event) {

    if (event === 'SIGNED_IN') {

        setTimeout(restorePendingAction, 300);

    }

});

})();
