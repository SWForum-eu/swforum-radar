//
// IMPORTS
//
const moment = require('moment')
const { JSDOM } = require('jsdom')
// libraries
// app modules
const APIFeatures = require('../utils/apiFeatures')
const AppError = require('./../utils/AppError')
const catchAsync = require('../utils/catchAsync')
const { Classification } = require('../models/classificationModel')
const { MTRLScore } = require('../models/mtrlScoreModel')
const classificationController = require('./../controllers/classificationController')
const mtrlScoresController = require('./../controllers/mtrlScoresController')
const radarController = require('../controllers/radarController')
const { roundDec } = require('../../common/util/maths')
const modelController = require('../controllers/modelController')
const User = require('../models/userModel')
const Radar = require('../models/radarModel')
const { Project } = require('../models/projectModel')
const { jrcTaxonomy } = require('./../../common/datamodel/jrc-taxonomy')
const { validSlug, validCwId } = require('../utils/validator')
//
// MIDDLEWARE
//
// Add the editions to each request for the header menu
exports.getEditions = catchAsync(async (req, res, next) => {
    // 1) Get editions
    const editions = await radarController.getEditions()
    // 2) Error handling
    if (!editions || editions.length === 0) {
        res.locals.alert = {
            status: 'warning',
            message: 'Unable to fetch radar editions.',
        }
    } else {
        // 4) process result
        res.locals.editions = editions
    }

    next()
})

/********************************/
/*                              */
/*   PUBLIC HANDLER FUNCTIONS   */
/*                              */
/********************************/
//
// show main/entry page
//
exports.showMain = catchAsync(async (req, res, next) => {
    // 1) Fetch some key figures from the DB
    const kpis = (
        await Project.aggregate([
            {
                $group: {
                    _id: 1,
                    totalCost: { $sum: '$totalCost' },
                    projects: { $sum: 1 },
                    calls: { $addToSet: '$call' },
                    start: { $min: '$startDate' },
                    end: { $max: '$endDate' },
                },
            },
        ])
    )[0]
    kpis.calls = kpis.calls.length // reduce calls array to its length
    kpis.span = moment(kpis.end).diff(kpis.start, 'months') + 1 // reduce start and end to months
    kpis.span = roundDec(kpis.span / 12, 1) // in years, with one decimal
    kpis.totalCost = roundDec(kpis.totalCost / 1000000000, 1) // budget in €bn

    // TODO expand on default content.
    res.status(200).render('main', {
        title: 'Welcome',
        pageclass: 'main',
        kpis,
    })
})

//
// Fetch the requested radar, and render the 'radar template page
//
exports.showRadar = catchAsync(async (req, res, next) => {
    // 1) If there s a slug, fetch edition, otherwise fetch live
    let radar
    if (req.params.slug) radar = await showEdition(req, res, next)
    else radar = await showLive(req, res, next)

    // 2) show success page - errors are handled/raised in the calls above
    res.status(200).render(`${__dirname}/../views/radar`, {
        title: radar.name,
        radar,
        jrcTaxonomy,
    })
})

const showEdition = async (req, res, next) => {
    // 1) Get the requested radar slug
    const { slug } = req.params

    // 2) Fetch the corresponding radar
    const radar = await radarController.getRadarBySlug(slug)
    if (!radar) {
        return next(new AppError(`No radar found for id ${slug}.`, 404))
    }

    // 3) Return the radar
    return radar
}

const showLive = async (req, res, next) => {
    // 1) get transient live radar from radar controller
    const radar = await radarController.getLiveRadar()

    // 2) Return the radar
    return radar
}

/******************************/
/*                            */
/*   USER ACCOUNT FUNCTIONS   */
/*                            */
/******************************/

//
// show the login form
//
exports.loginForm = (req, res) => {
    res.status(200).render('user/login', {
        title: 'Login',
    })
}

//
// User account page
//
exports.accountPage = (req, res) => {
    res.status(200).render('user/account', {
        title: 'Your account',
    })
}

//
// User account page
//
exports.manageUsers = catchAsync(async (req, res, next) => {
    // 1) Fetch all users - except "myself"
    const users = await User.find({
        _id: { $ne: res.locals.user._id },
    })
    if (!users) {
        return next(new AppError(`No users found in this application. Schrodinger's users?`, 404))
    }

    // 2) Render user management page
    res.status(200).render('admin/manageUsers', {
        title: 'Manage users',
        users,
    })
})

exports.editUser = catchAsync(async (req, res, next) => {
    // 1) Fetch the user
    const user = await User.findById(req.params.id)
    if (!user) {
        return next(new AppError(`No user found with the given id!`, 404))
    }

    // 2) Render user edit page
    res.status(200).render('admin/editUser', {
        title: 'Edit use details',
        targetUser: user,
    })
})

/******************************/
/*                            */
/*   RADAR PAGES  FUNCTIONS   */
/*                            */
/******************************/

//
// Radars overview page
//
exports.manageRadars = catchAsync(async (req, res, next) => {
    // 1) Fetch all Radars
    const radars = await new APIFeatures(Radar.find(), { sort: '-year,release' }).filter().sort()
        .query
    if (!radars) {
        return next(new AppError(`No radars found AT ALL in this application.`, 404))
    }

    // 2) Render radar management page
    res.status(200).render('admin/manageRadars', {
        title: 'Manage radars',
        radars,
    })
})

//
// Edit a radar
//
exports.editRadar = catchAsync(async (req, res, next) => {
    // 1) Fetch the radar
    const radar = await Radar.findById(req.params.id)
    if (!radar) {
        return next(new AppError(`No radar found with the given id!`, 404))
    }

    // 2) Render radar edit page
    res.status(200).render('admin/editRadar', {
        title: 'Edit radar',
        radar,
    })
})

/**************************/
/*                        */
/*   PROJECT  FUNCTIONS   */
/*                        */
/**************************/

//
// Projects overview page
//
exports.manageProjects = catchAsync(async (req, res, next) => {
    // 1) Fetch all Projects
    const projects = await new APIFeatures(Project.find(), { sort: 'cw_id' }).filter().sort().query
    if (!projects) {
        return next(new AppError(`No proejcts found AT ALL in this application.`, 404))
    }

    // Decorate the projects with their classification and their last score (temporarily)
    await Promise.all(
        projects.map(async (prj) => {
            // add classification
            if (prj.hasClassifications) {
                let segment = await classificationController.getClassification(prj._id, Date.now())
                prj.classification = segment.classification
            }
            // add MTRL score
            if (prj.hasScores) {
                let score = await mtrlScoresController.getScore(prj._id, Date.now())
                prj.mtrl = score
            }
        })
    )

    // 2) Render projects management page
    res.status(200).render('admin/manageProjects', {
        title: 'Manage projects',
        projects,
    })
})

//
// Edit a project
//
exports.editProject = catchAsync(async (req, res, next) => {
    // 1) Fetch the project
    const project = await Project.findById(req.params.id)
    if (!project) {
        return next(new AppError(`No project found with the given id!`, 404))
    }

    // 2) Get all classifications and MTRL scores for the project
    const classifications = await Classification.find({ project: project._id }).sort({
        classifiedOn: 1,
    })
    const mtrlScores = await MTRLScore.find({ project: project._id }).sort({ scoringDate: 1 })

    // 4) Render radar edit page
    res.status(200).render('admin/editProject', {
        title: 'Edit project',
        project,
        classifications,
        mtrlScores,
        jrcTaxonomy,
    })
})

/*************************/
/*                       */
/*        WIDGETS        */
/*                       */
/*************************/
//
// Standard project widget
//
exports.getProjectWidget = catchAsync(async (req, res, next) => {
    // 1) Check parameters
    if (req.params.cwid && !validCwId(req.params.cwid)) throw new AppError('Invalid project CW id.')

    // 2) Get the latest MTRL submission for the given project
    const data = await Project.aggregate()
        .match({ cw_id: { $eq: Number(req.params.cwid) } })
        .lookup({
            from: 'mtrlscores',
            let: { prjID: '$_id' },
            pipeline: [
                { $match: { $expr: { $eq: ['$project', '$$prjID'] } } },
                { $sort: { scoringDate: -1, _id: -1 } },
                { $limit: 1 },
            ],
            as: 'score',
        })
        .exec()
    if (!data || data.length < 1)
        throw new AppError(`No data found for widget for project no. ${req.params.cwid}`)

    console.log(data)

    // // 1) Get the correct radar (default to latest if not provided)
    // const radar = await radarController.getBySlugOrLatest(req.params.radar, 'rendering')
    // if (!radar) throw new AppError(`No project for id ${req.params.cwid} found.`)

    // // 2) Find the entry for the project with the given cwID
    // const blipRegex = new RegExp(`(<g class="blip" id="blip-${req.params.cwid}" .+?<\\/g>)`, 'g')
    // const blipStr = radar.rendering.rendering.get('svg').match(blipRegex)[0]
    // const fakeDoc = new JSDOM('<html><head></head><body></body></html>').window.document
    // fakeDoc.querySelector('body').innerHTML = blipStr
    // console.log(fakeDoc.querySelector('g'))

    // ??) Render the widget
    res.status(200).render('widgets/project.pug', {
        mrl: data[0].score[0].mrl,
        trl: data[0].score[0].trl,
    })
})

exports.showDisclaimer = catchAsync(async (req, res, next) => {
    res.status(200).render('disclaimer.pug', {})
})

exports.showDocumentation = catchAsync(async (req, res, next) => {
    res.status(200).render('documentation.pug', {})
})
