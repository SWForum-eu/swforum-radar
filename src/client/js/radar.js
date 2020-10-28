/* eslint-disable */
//
// IMPORTS
//
// libraries

// app modules
import linkupRadar from './radar/linkupRadar'
import { showFilterTagForm, updateFilterList, filterBlips } from './radar/filterTags'
import { getTags, updateTags } from './util/localStore'
import showAlert from './util/alert'
import { login, logout } from './user/login'
import changePassword from './user/userSettings'
import {
    createUser,
    deleteUser,
    updateUsersDetails,
    updateUsersPassword,
} from './admin/userActions'
import { createRadar, updateRadar, deleteRadar, advanceRadar } from './admin/radarActions'
import { createProject, deleteProject, updateProject, importProjects } from './admin/projectActions'
import { addClassification, addScore } from './admin/scoreAndClassify'
import { getName } from '../../common/datamodel/jrc-taxonomy'
import { searchProjects, clearProjects } from './radar/search.js'

/****************************************************************
 *                                                              *
 *                       M E N U    B A R                       *
 *                                                              *
 ****************************************************************/

//
// RADAR MENU BUTTONS EVENT
//
const radarButtons = document.querySelectorAll('.radar')
if (radarButtons) {
    radarButtons.forEach((btn) => {
        btn.addEventListener('click', (event) => {
            event.preventDefault()
            const slug = event.target.getAttribute('radar')
            location.assign(`/radar/${slug}`)
        })
    })
}

//
// ADMIN MENU BUTTONS EVENT
//
const adminButtons = document.querySelectorAll('.admin')
if (adminButtons) {
    adminButtons.forEach((btn) => {
        btn.addEventListener('click', (event) => {
            event.preventDefault()
            const route = event.target.getAttribute('route')
            location.assign(route)
        })
    })
}

/****************************************************************
 *                                                              *
 *           U S E R   A C C O U N T   A C T I O N S            *
 *                                                              *
 ****************************************************************/

//
// Login form
//
const loginForm = document.getElementById('login-form')
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault()
        const name = document.getElementById('name').value
        const password = document.getElementById('password').value
        login(name, password, document.referrer)
    })
}

//
// Logout
//
const logOutBtn = document.querySelector('.nav__el--logout')
if (logOutBtn) logOutBtn.addEventListener('click', logout)

//
// Change password
//
const passwordForm = document.getElementById('password-form')
if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        document.querySelector('.btn--update-password').textContent = 'Updating...'

        const current = document.getElementById('current').value
        const newPass = document.getElementById('newPass').value
        const newConfirm = document.getElementById('newConfirm').value
        await changePassword(current, newPass, newConfirm)

        document.querySelector('.btn--update-password').textContent = 'Change password'
        document.getElementById('current').textContent = ''
        document.getElementById('newPass').textContent = ''
        document.getElementById('newConfirm').textContent = ''
    })
}

/****************************************************************
 *                                                              *
 *                  R A D A R    D I S P L A Y                  *
 *                                                              *
 ****************************************************************/

//
// Interactive search form
//
const searchField = document.getElementById('search_term')
if (searchField) {
    searchField.addEventListener('keyup', (e) => searchProjects(searchField.value))
}
// clear button
const clearBtn = document.getElementById('search_clear')
if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
        if (searchField) searchField.value = ''
        clearProjects()
    })
}

//
// Display the radar
//
const radarSection = document.getElementById('radar')
if (radarSection) {
    // The static display of the radar is done through the PUG template
    // This is to make it dynamic

    // pre-1)   The radar has already been loaded and is present in the HTML DOM tree.
    //          This might change in the future where we asynch load the radar data via
    //          API call in this function

    // 1) Filter blips according to the filter tags set by the user
    const filterTags = getTags()
    filterBlips(filterTags)

    // 2) show the current filter list in the UI
    updateFilterList(document.getElementById('jrctagsfilter'), filterTags, getName)

    // 3) link up the radar to make it dynamic
    linkupRadar(document.getElementById('radar'))
}

//
// Show JRC tag filter modal form
//
const jrcTagFormButton = document.querySelector('#jrctagsfilter button')
if (jrcTagFormButton) {
    // wire up the button to show the filter tags meny
    jrcTagFormButton.addEventListener('click', (event) => {
        event.preventDefault()
        // show modal
        showFilterTagForm()
    })
}

//
// Radio buttons for any or all matching
//
const anyAllRadios = document.querySelectorAll('div.ops input')
if (anyAllRadios) {
    anyAllRadios.forEach((radio) => {
        radio.addEventListener('click', async (event) => {
            const filter = getTags()
            filter.union = event.target.value
            await updateTags(filter)
            filterBlips(filter)
        })
    })
}
/*********************************************************/
/*********************************************************/
/*********************************************************/
/*********************************************************/
/*********************************************************/

//
// Create user
//
const newUserForm = document.getElementById('new-user-form')
if (newUserForm) {
    newUserForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        document.getElementById('btn--create-user').textContent = 'Updating...'

        const name = document.getElementById('name').value
        const email = document.getElementById('email').value
        const password = document.getElementById('password').value
        const confirm = document.getElementById('confirm').value
        const role = document.getElementById('role').value
        await createUser(name, email, password, confirm, role, location.href)

        document.getElementById('btn--create-user').textContent = 'Create user'
        document.getElementById('name').textContent = ''
        document.getElementById('email').textContent = ''
        document.getElementById('password').textContent = ''
        document.getElementById('confirm').textContent = ''
    })
}

//
// DELETE USER LINKS
//
const deleteUserLinks = document.querySelectorAll('.delete-user')
if (deleteUserLinks) {
    deleteUserLinks.forEach((link) => {
        link.addEventListener('click', async (event) => {
            event.preventDefault()
            await deleteUser(event.path[1].getAttribute('route'), location.href)
        })
    })
}

//
// EDIT USER LINKS
//
const editUserLinks = document.querySelectorAll('.edit-user')
if (editUserLinks) {
    editUserLinks.forEach((link) => {
        link.addEventListener('click', async (event) => {
            event.preventDefault()
            location.assign(event.path[1].getAttribute('route'))
        })
    })
}

//
// UPDATE USER'S DETAILS BUTTON
//
const updateUserDetailsForm = document.getElementById('edit-user-form')
if (updateUserDetailsForm) {
    updateUserDetailsForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        const name = document.getElementById('name').value
        const email = document.getElementById('email').value
        const role = document.getElementById('role').value
        const id = document.getElementById('userid').value
        await updateUsersDetails(name, email, role, id)
    })
}

//
// UPDATE USER'S PASSWORD BUTTON
//
const setUserPasswordForm = document.getElementById('set-password-form')
if (setUserPasswordForm) {
    setUserPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        const userid = document.getElementById('userid').value
        const password = document.getElementById('newPass').value
        const confirm = document.getElementById('newConfirm').value
        await updateUsersPassword(userid, password, confirm)
    })
}

//
// CREATE RADAR FORM
//
const createRadarForm = document.getElementById('new-radar-form')
if (createRadarForm) {
    createRadarForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        const edition = document.getElementById('edition').value
        const year = document.getElementById('year').value
        const summary = document.getElementById('summary').value

        await createRadar(edition, year, summary)
    })
}

//
// EDIT RADAR BUTTONS
//
const editRadarLinks = document.querySelectorAll('.edit-radar')
if (editRadarLinks) {
    editRadarLinks.forEach((link) => {
        link.addEventListener('click', async (event) => {
            event.preventDefault()
            location.assign(event.path[1].getAttribute('route'))
        })
    })
}

//
// DELETE RADAR BUTTONS
//
const deleteRadarLinks = document.querySelectorAll('.delete-radar')
if (deleteRadarLinks) {
    deleteRadarLinks.forEach((link) => {
        link.addEventListener('click', async (event) => {
            event.preventDefault()
            console.log(event.path[1].getAttribute('route'))
            await deleteRadar(event.path[1].getAttribute('route'), location.href)
        })
    })
}

//
// EDIT INDIVIDUAL RADAR
//
const updateRadarForm = document.getElementById('edit-radar-form')
if (updateRadarForm) {
    updateRadarForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        const id = document.getElementById('radarid').value
        const summary = document.getElementById('summary').value
        await updateRadar(id, summary)
    })
}

//
// ADMINISTER RADAR BUTTONS
//
const administerRadarForms = document.querySelectorAll('.administer-radar-form')
if (administerRadarForms) {
    administerRadarForms.forEach((form) => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault()
            const cutoff = document.getElementById('cutoff').value
            const route = event.target.getAttribute('route')
            advanceRadar(route, cutoff, location.href)
        })
    })
}

//
// CREATE NEW PROJECT FORM
//
const newProjectForm = document.getElementById('new-project-form')
if (newProjectForm) {
    newProjectForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        const values = {
            name: document.getElementById('name').value,
            rcn: document.getElementById('rcn').value,
            title: document.getElementById('title').value,
            startDate: document.getElementById('startdate').value,
            endDate: document.getElementById('enddate').value,
            call: document.getElementById('fundingcall').value,
            type: document.getElementById('projecttype').value,
            budget: document.getElementById('budget').value,
            projectURL: document.getElementById('projecturl').value,
            fundingBodyLink: document.getElementById('fundingbodylink').value,
            cwurl: document.getElementById('cwprojecthublink').value,
            teaser: document.getElementById('teaser').value,
        }
        await createProject(values)
    })
}

//
// DELETE PROJECT LINKS
//
const deleteProjectLinks = document.querySelectorAll('.delete-project')
if (deleteProjectLinks) {
    deleteProjectLinks.forEach((link) => {
        link.addEventListener('click', async (event) => {
            event.preventDefault()
            await deleteProject(event.path[1].getAttribute('route'), location.href)
        })
    })
}

//
// EDIT PROJECT BUTTONS
//
const editProjectLinks = document.querySelectorAll('.edit-project')
if (editProjectLinks) {
    editProjectLinks.forEach((link) => {
        link.addEventListener('click', async (event) => {
            event.preventDefault()
            location.assign(event.path[1].getAttribute('route'))
        })
    })
}

//
// EDIT PROJECT FORM
//
const editProjectForm = document.getElementById('edit-project-form')
if (editProjectForm) {
    editProjectForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        const values = {
            id: document.getElementById('projectid').value,
            name: document.getElementById('name').value,
            rcn: document.getElementById('rcn').value,
            title: document.getElementById('title').value,
            startDate: document.getElementById('startdate').value,
            endDate: document.getElementById('enddate').value,
            call: document.getElementById('fundingcall').value,
            type: document.getElementById('projecttype').value,
            budget: document.getElementById('budget').value,
            projectURL: document.getElementById('projecturl').value,
            fundingBodyLink: document.getElementById('fundingbodylink').value,
            cwurl: document.getElementById('cwprojecthublink').value,
            teaser: document.getElementById('teaser').value,
        }
        await updateProject(values)
    })
}

//
// Upload a file and import the projects
//
const uploadImportForm = document.getElementById('import-projects-form')
if (uploadImportForm) {
    uploadImportForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        const form = new FormData()
        form.append('importfile', document.getElementById('importfile').files[0])
        importProjects(form)
    })
}

//
// Add a category to a project
//
const addCategoryForm = document.getElementById('add-category-form')
if (addCategoryForm) {
    addCategoryForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        const cw_id = document.getElementById('cwid').value
        const classification = document.getElementById('classification').value
        const classifiedBy = 'Cyberwatching' // for now this is hardcoded when using the web UI
        const changeSummary = document.getElementById('changeSummary').value
        addClassification(cw_id, classification, classifiedBy, changeSummary)
    })
}

//
// Add a MTRL score to a project
//
const addScoreForm = document.getElementById('add-score-form')
if (addScoreForm) {
    addScoreForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        const cw_id = document.getElementById('cwid').value
        const mrl = document.getElementById('mrl').value
        const trl = document.getElementById('trl').value
        const scoringDate = document.getElementById('scoringdate').value
        console.log(cw_id, mrl, trl, scoringDate)
        addScore(cw_id, mrl, trl, scoringDate)
    })
}

//
// Taxonomy tag checkboxes
//
// when selecting a dimension header, unselect al the dimension's terms
const dimensionHeaders = document.querySelectorAll('.dimension-header')
if (dimensionHeaders) {
    dimensionHeaders.forEach((box) => {
        box.addEventListener('click', (event) => {
            const termBoxes = box.parentNode.parentNode.querySelectorAll('.term')
            termBoxes.forEach((tB) => (tB.checked = false))
        })
    })
}
// when selecting a dimension's term, unselect the dimension header
const dimensionTerms = document.querySelectorAll('.term')
if (dimensionTerms) {
    dimensionTerms.forEach((termBox) => {
        termBox.addEventListener('click', (event) => {
            const parentBox = termBox.parentNode.parentNode.parentNode.parentNode.querySelector(
                '.dimension-header'
            )
            parentBox.checked = false
        })
    })
}

//
// Taxonomy tags submit
//
const taxonomySubmit = document.getElementById('edit-tags-form')
if (taxonomySubmit) {
    taxonomySubmit.addEventListener('submit', async (event) => {
        event.preventDefault()
        const values = {
            id: document.getElementById('projectid').value,
            tags: [],
        }
        document.querySelectorAll('.term:checked,.dimension-header:checked').forEach((c) => {
            values.tags.push(c.value)
        })
        await updateProject(values)
    })
}

//
// Radar description expander
//
const rdExpander = document.querySelector('#overview #summary-flicker')
if (rdExpander) {
    rdExpander.addEventListener('click', (event) => {
        event.target.classList.toggle('open')
        event.target.parentNode.parentNode.classList.toggle('open')
    })
}

// show alerts sent by the server
const alertMsg = document.querySelector('body').dataset.alertmsg
const alertType = document.querySelector('body').dataset.alerttype
if (alertMsg && alertType) showAlert(alertType, alertMsg, 2000)