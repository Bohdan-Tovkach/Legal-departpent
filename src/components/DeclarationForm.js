'use-strict'
// @ts-check
/* eslint-disable no-unused-vars */
import { 
  EdrLegal,
  Founder,
  Signer,
  AxiosService,
  YourControlRNBOResult,
  YourControlSanctions,
} from '../types'
/* eslint-enable no-unused-vars */
import Vue from 'vue'

import { 
  mdiClose, 
  mdiCog,
  mdiAccountSearch,
  mdiMenuDown,
  mdiInformation,
  mdiAxisZRotateClockwise,
  mdiWindowMinimize,
  mdiSortAlphabeticalAscendingVariant,
} from '@mdi/js' 

import { trimExceededLength, isPep } from '../utils/helper'
import { transliterate } from '../utils/utils'
import { transliteRule } from './translite'
/* eslint-disable no-unused-vars */
import { AxiosResponse, AxiosError, Cancel } from 'axios'
/* eslint-enable no-unused-vars */
// @ts-ignore
import LegalTree from './legal/tree.vue'
// @ts-ignore
import PersonInfo from './person/person.vue'
import { validationMixin } from 'vuelidate'
import { minLength, required } from 'vuelidate/lib/validators'
import { YourControlErrCodes } from '../utils/utils'

// @ts-ignore
window.String.prototype.replaceUnused = function() {
  return this
    .replace(/TOV/g, '')
    .replace(/LLC/g, '')
    .replace(/TOV/g, '')
    .replace(/ТОВ/g, '')
    .replace(/,/g, '')
}

const legal =  {
  mixins: [validationMixin],
  components: {
    LegalTree,
    PersonInfo,
  },
  name: 'DeclarationForm',
  validations() {
    const legalEdrpou = this.choosedLegal && this.choosedEdrpou
      ? {
          edrpou: {
            required,
            minLength: minLength(8),
          },
        } 
      : {}
    
    const companyName = this.choosedLegal && this.choosedCompanyName
        ? { companyName: { required } } : {}

    const personInn = this.personInn 
      ? {
          inn: {
            required,
            minLength: minLength(10),
          }
        } 
      : {}
    const personInitials = this.personInitials 
      ? {
          lastName: {required},
          firstName: {required},
          // patronymic: {required},
      } : {} 

    return {
      ...legalEdrpou,
      ...personInitials,
      ...personInn,
      ...companyName,
    }
  },
  data: () => ({
    /* Bindings */
    lastName: null,
    firstName: null,
    patronymic: null,
    inn: null,
    edrpou: null,
    companyName: null,
    globalObject: {},
    /* Person items */
    edrListPerson: [],
    eDeclarationList: [],
    nazkDeclarationList: [],
    rnboList: [],
    unSanctionList: [],
    unTerrorList: [],
    esSanctionList: [],
    usSanctionList: [],
    yourControlRnboList: [],
    yourControlDsfmuList: [],
    yourControlSanctionList: [],
    australiaSanctionList: [],
    canadaSanctionList: [],
    /* Data */
    searchVariant: null,
    legalSearchVariant: null,
    searchType: null,
    /* Booleans */
    loading: false,
    personDialog: false,
    /* Icons */
    mdiClose,
    mdiCog,
    mdiAccountSearch,
    mdiMenuDown,
    mdiInformation,
    mdiAxisZRotateClockwise,
    mdiWindowMinimize,
    mdiSortAlphabeticalAscendingVariant,
    attemptsToGetNewEdr: 0,
    maxAttempts: 50,
    /** @param { array } handledEdrpous - List of "edrpou" codes that have already been checked */
    handledEdrpous: [],
    yourControlTimeOut: 3000,
    legalDialog: false,
    commonErr: "Поле обов`язкове",
    baseUrl: null,
    /* Request hint */
    ukVersion: true,
    showRequisite: false,
    showRule: false,
    /* Table */
    transliteRuleTH: [
      {text: "Українська", value: "ua", sortable: false, align: "start"},
      {text: "Початок слова (EN)", value: "en", sortable: false, align: "center"},
      {text: "В iнших поз-iях (EN)", value: "position", sortable: false, align: "center"},
      {text: "Приклад UK", value: "exampleUK", sortable: false, align: "center"},
      {text: "Приклад EN", value: "exampleEN", sortable: false, align: "center"},
    ],
    searchConfigDialog: false,
    /* Search config */
    yourScoreDSFMU: false, 
    yourScoreRNBO: false,
    yourScoreForeignLegalSanctions: false,
    exceptions: [
      'КІНЦЕВИЙ БЕНЕФІЦІАРНИЙ ВЛАСНИК (КОНТРОЛЕР) - ВІДСУТНІЙ',
      'КІНЦЕВИЙ БЕНЕФІЦІАРНИЙ ВЛАСНИК (КОНТРОЛЕР)',
      'КІНЦЕВИЙ БЕНЕФІЦІАРНИЙ ВЛАСНИК',
      'КОНСОРЦІУМ',
      // eslint-disable-next-line
      '\(КОНТРОЛЕР\)',
    ],
  }),
  methods: {
    transliterate,
    isPep,
    clearPersonData() {
      this.edrListPerson.splice(0)
      this.eDeclarationList.splice(0)
      this.nazkDeclarationList.splice(0)
      this.rnboList.splice(0)
      this.unSanctionList.splice(0)
      this.unTerrorList.splice(0)
      this.esSanctionList.splice(0)
      this.usSanctionList.splice(0)
      this.yourControlRnboList.splice(0)
      this.yourControlDsfmuList.splice(0)
      this.yourControlSanctionList.splice(0)
      this.canadaSanctionList.splice(0) 
      this.australiaSanctionList.splice(0)
    },
    clearPersonFields() {
      this.firstName = null
      this.lastName = null 
      this.patronymic = null
      this.inn = null
      this.$v.$reset()
    },  
    clearLegalFields() {
      this.edrpou = null
      this.$v.$reset()
    },
    trimExceededLength,
    /** @param {{companyName: string}} object */
    checkUsLegalSanctions(object) {
      const url = this.baseUrl + '/us-legal-sanctions'
      return this.$axios
        .post(url, object).then(res => res).catch(err => this.getRejectedKey(err))
    },
    /** @param {{companyName: string}} object */
    checkUnLegalTerrors(object) {
      const url = this.baseUrl + '/un-legal-terrors'
      return this.$axios
        .post(url, object).then(res => res).catch(err => this.getRejectedKey(err))
    },
    /** @param {{companyName: string}} object */
    checkUnLegalSanctions(object) {
      const url = this.baseUrl + '/un-legal-sanctions'
      return this.$axios
        .post(url, object).then(res => res).catch(err => this.getRejectedKey(err))
    },
    /** @param {{edrpou: string | number, companyName: string}} object */
    checkEsLegalSanctions(object) { 
      const url = this.baseUrl + '/get-eu-legal-sanctions'
      return this.$axios
        .post(url, object).then(res => res).catch(err => this.getRejectedKey(err))
    },
    /** @param {{edrpou: string | number, companyName: string}} object */
    checkRnboLegals(object) {
      const url = this.baseUrl + '/get-legal-sanctions'
      return this.$axios
        .post(url, object).then(res => res).catch(err => this.getRejectedKey(err))
    },
    /** 
     * @function checkEDeclarations - Post capitalized person object
     * @param {{lastName: string, firstName: string, patronymic: string}} object */
    checkEDeclarations(object) { 
      const getDeclarations = (o) => {
        const url = this.baseUrl + '/get-declarations'
        return this.$axios.post(url, o).then(res => res).catch(err => this.getRejectedKey(err))
      }
      /** @param {AxiosResponse} res */
      const checkPublicity = async (res) => {
        const list = res.data?.results?.object_list
        if (! list?.length) return res

        const requests = list.map(async o => {
          const isPep = this.isPep(o.infocard.position) ? 'Так' : 'Нi'
          o.infocard.isPep = isPep
          const family = o?.related_entities?.people?.family

          if (family.length) {
            const nested = family.map(async p => {
              this.$set(o.infocard, 'family', [])
              if (p.trim() === "") return p
              const initials = this.getPersonInitials(p)

              return getDeclarations(initials).then(res => {
                let nestedDeclar = res.data.results.object_list
                if (nestedDeclar.length) {
                  nestedDeclar.forEach(obj => obj.infocard.isPep = this.isPep(obj.infocard.position))
                  nestedDeclar = nestedDeclar.filter(o => o.infocard.isPep)
                  o.infocard.family.push(...nestedDeclar.map(o => {
                    delete o.unified_source
                    return o
                  }))
                  return res
                }
                return res
              })
            })
            const result = await Promise.all(nested).then(o => o)
            return result
          } else return o
        })
        const result = await Promise.all(requests).then(() => res)
        return result
      }
      return getDeclarations(object).then(res => checkPublicity(res).then(checkPublicity => {console.log('checkPublicity', checkPublicity); return checkPublicity})).catch(err => this.getRejectedKey(err))
    },
    checkNazkDeclarations(person) {
      const { lastName, firstName, patronymic } = person
      const url = this.baseUrl + `/get-nazk-declarations?lastName=${lastName}&firstName=${firstName}&patronymic=${patronymic}`
      return this.$axios
        .get(url).then(res => res).catch(err => this.getRejectedKey(err))
    },
    /** 
     * @function checkRnboPersons - Post capitalized person object
     * @param {{lastName: string, firstName: string, patronymic: string}} object */
    checkRnboPersons(object) {
      if (this.choosedLegal) {
        // @ts-ignore
        object.params = { fullMatch: true}
      }
      const url = this.baseUrl + '/get-person-sanctions'
      return this.$axios
        .post(url, object).then(res => res).catch(err => this.getRejectedKey(err))
    },
    /** 
     * @function checkUnPersSanctions - Post transliterated person object
     * @param {{lastName: string, firstName: string, patronymic: string}} object */
    checkUnPersSanctions(object) {
      const url = this.baseUrl + '/un-person-sanctions'
      return this.$axios
        .post(url, object).then(res => res).catch(err => this.getRejectedKey(err))
    },
    /** 
     * @function checkUsPersonSunctions - Post transliterated person object
     * @param {{lastName: string, firstName: string, patronymic: string}} object */
    checkUsPersonSunctions(object) {
      const url = this.baseUrl + '/us-person-sanctions'
      return this.$axios
        .post(url, object).then(res => res).catch(err => this.getRejectedKey(err))
    },
    /** 
     * @function checkEsPersonSunctions - Post transliterated person object
     * @param {{lastName: string, firstName: string, patronymic: string}} object */
    checkEsPersonSunctions(object) {
      const url = this.baseUrl + '/get-eu-person-sanctions'
      return this.$axios
        .post(url, object).then(res => res).catch(err => this.getRejectedKey(err))
    },
    /** 
     * @function checkUnTerrors - Post transliterated person object
     * @param {{lastName: string, firstName: string, patronymic: string}} object */
    checkUnTerrors(object) {
      const url = this.baseUrl + '/un-person-terror'
      return this.$axios
        .post(url, object).then(res => res).catch(err => this.getRejectedKey(err))
    },
    /**
     * @param {{apiKey: string, inn?: string | number, edrpou?: string | number, currentData?: boolean}} object 
     * @returns {Promise<AxiosResponse<EdrLegal>>} */ 
    // eslint-disable-next-line
    getEdr(object) {
      // @ts-ignore
      if (!object.edrpou && !object.inn) return Promise.resolve()
      if (this.attemptsToGetNewEdr === this.maxAttempts) {
        this.attemptsToGetNewEdr = 0
        object.currentData = true
      }
      const url = this.baseUrl + `/your-control/get-edr`
      return this.$axios
        .post(url, object)
        .then(res => {console.log('get-edr res', JSON.stringify(res)); return this.checkStatus(res)})
        .catch(err => this.getRejectedKey(err))
    },
    /**
     * @typedef {{status: string, resultUrl: string}} YourControlRNBOUrl */
    /** 
     * @function getRnboResultUrl - return link with resultId (RNBO - sanctions)
     * @param {{lastName: string, firstName: string, middleName: string, apiKey: string}} object
     * @return {Promise<AxiosResponse<YourControlRNBOUrl>>} */
    // eslint-disable-next-line
    getRnboResultUrl(object) {
      const url = this.baseUrl + '/your-control/rnbo/get-person-url'
      return this.$axios
        .post(url, object).then(res => this.checkStatus(res)).catch(err => this.getRejectedKey(err))
    },
    /** 
     * @function getDsfmuResultUrl - return link with resultId (DSMFU - terros)
     * @param {{lastName: string, firstName: string, middleName: string, apiKey: string}} object
     * @return {Promise<AxiosResponse<YourControlRNBOUrl>>} */
    // eslint-disable-next-line
    getDsfmuResultUrl(object) {
      const url = this.baseUrl + '/your-control/dsfmu/get-person-url'
      return this.$axios
        .post(url, object).then(res => this.checkStatus(res)).catch(err => this.getRejectedKey(err))
    },


    /** @param {{edrpou: string | number, companyName: string}} object */
    checkCanadaLegalSanctions (object) {
      const url = this.baseUrl + '/canada-legal-sanctions'
      return this.$axios
        .post(url, object).then(res => res).catch(err => this.getRejectedKey(err))
    },
    /** 
     * @param {{lastName: string, firstName: string, patronymic: string}} object */
    checkCanadaPersonSanctions (object) {
      const url = this.baseUrl + '/canada-person-sanctions'
      return this.$axios
        .post(url, object).then(res => res).catch(err => this.getRejectedKey(err))
    },
    /** 
     * @param {{lastName: string, firstName: string, patronymic: string}} object */
    checkAustraliaPersonSanctions (object) {
      const url = this.baseUrl + '/australia-person-sanctions'
      return this.$axios
        .post(url, object).then(res => res).catch(err => this.getRejectedKey(err))
    },
    /** @param {{edrpou: string | number, companyName: string}} object */
    checkAustraliaLegalSanctions (object) {
      const url = this.baseUrl + '/australia-legal-sanctions'
      return this.$axios
        .post(url, object).then(res => res).catch(err => this.getRejectedKey(err))
    },


    checkStatus(res) {
      const code = res?.data?.code

      if (YourControlErrCodes.includes(code)) {
        this.$snotify.simple(res.data.code + " " + res.data.message)
        throw res
      }
      return res
    },
    /** 
     * @param {{resultUrl: string, apiKey: string}} object
     * @return {Promise<AxiosResponse<YourControlRNBOResult>>} */ // AxiosResponse["data"]
    // eslint-disable-next-line
    getResult(object) {
      const url = this.baseUrl + '/your-control/get-person-result'
      return this.$axios
        .post(url, object).then(res => this.checkStatus(res)).catch(err => this.getRejectedKey(err))
    },
    
    /** 
     * @function checkYourControlSanctions - Foreign sanctions (USA, Japan, EU)
     * @param {{edrpou: string | number, apiKey: string}} object
     * @return {Promise<AxiosResponse<YourControlSanctions>>} */
    checkYourControlSanctions(object) {
      const url = this.baseUrl + '/your-control/sanctions'
      return this.$axios
        .post(url, object).then(res => this.checkStatus(res)).catch(err => this.getRejectedKey(err))
    },
    /** @param {string} str */
    getLegalName(str) {
      if (!str || typeof str !== "string") return ''
      if (!str.includes('"') && !str.includes('«')) return str

      const split = string => {
        const separator = str.includes('«') ? '«' : '"'
        if (separator === '«') {
          return string.split("«").join("@").split("»").join("@").split('@')
        }
        return string.split('"')
      }

      return split(str)
        .filter(v => !v.toUpperCase().includes('ТОВ') && !v.toUpperCase().includes('LLC') && !v.toUpperCase().includes('TOV'))
        .reduce((a, b) => a.length > b.length && !this.exceptions.includes(a.trim()) ? a : b)
        .replace(/TOV/g, '')
        .replace(/LLC/g, '')
        .replace(/TOV/g, '')
        .replace(/ТОВ/g, '')
        // eslint-disable-next-line
        .replace(/\./g, '\\.')
    },
    /** 
     * @param {Cancel} cancel - Axios cancel object */
    getRejectedKey (cancel) {
      // @ts-ignore
      if (cancel instanceof Error) throw cancel
      if (! cancel) Promise.reject(new Error ('"getRejectedKey": "cancel"/"object" parameter required '))
      if (! cancel?.message) Promise.reject(cancel)
      if (cancel?.message) {
        const key = cancel.message
        return Promise.resolve(this.$store.state[key])
      }
    },
    /**
     * @param {EdrLegal | Founder | {}} mapedObject
     * @param {string | number } code - EDRPOU code */
    getEdrData(mapedObject, code, companyName) {
      this.loading = true
      const yourControlEdrLegal = { edrpou: code, apiKey: process.env.VUE_APP_YOUR_SCORE_API_KEY, inn: null }  
      const resultError = 'За вашим запитом нiчого не знайдено'
      if (code) {
        this.handledEdrpous.push(code)

        return this.getEdr(yourControlEdrLegal)
          .then(res => {
            if (res?.data?.status === "Update in progress") {
              this.attemptsToGetNewEdr ++
              return new Promise(resolve => {
                setTimeout(() => resolve(this.getEdrData(mapedObject, code)), this.yourControlTimeOut)
              })
            }
            // @ts-ignore
            if (res?.data?.code === 'InvalidParameters') {
              return res
            }
            /** @type {EdrLegal} */
            let legal, legalEnName, legalUaName
            if (res?.data) {
              legal = this.assignObject(mapedObject, JSON.parse(JSON.stringify(res.data)))
              // @ts-ignore
              legalEnName = this.getLegalName(legal?.nameInEnglish?.shortName).replaceUnused()
              // @ts-ignore
              legalUaName = this.getLegalName(legal?.name?.shortName).replaceUnused()
            }
            
            // casting legal.name to string
            let founderEnName, founderUaName, name
            if (legal && typeof legal.name === 'string') {
              // @ts-ignore
              name = this.getLegalName(legal.name).replaceUnused()
              /** @type {Founder} */
              founderEnName = this.transliterate(name)
              // @ts-ignore
              founderUaName = name
              // @ts-ignore
            } else if (typeof mapedObject.name === "string") {
              // @ts-ignore
              name = this.getLegalName(mapedObject.name).replaceUnused()
              // @ts-ignore
              founderEnName = this.transliterate(name)
              // @ts-ignore
              founderUaName = name
              // @ts-ignore
            } else if (typeof mapedObject.name === "object") {
              // @ts-ignore
              name = this.getLegalName(mapedObject.name.shortName).replaceUnused()
              // @ts-ignore
              founderEnName = this.transliterate(name)
              // @ts-ignore
              founderUaName = name
            }

            const requisites = {
              nameEn: legalEnName || founderEnName, 
              nameUa: legalUaName || founderUaName
            }
            const object = legal || mapedObject
            // @ts-ignore
            this.checkLegal(object, requisites)

            const trimExceptedStr = (founder) => {
              this.exceptions.forEach(exc => {
                const regex = new RegExp(`${exc}`, 'gi')
                founder.name = founder.name
                  .replace(regex, '')
                  .replace(/[()]/g, '')
                  .trim()
              })
              return founder
            }
            
            if (! legal || ! legal.code) {
              this.loading = false
              return Promise.resolve()
            }
            const legalFounders = legal?.founders
              ?.filter(founder => {
                return founder.name.includes('"') || founder.name.includes('«')
              })
              .map(trimExceptedStr) || []
            const personFounders = legal?.founders
              ?.filter(founder => {
                return !founder.name.includes('"') && !founder.name.includes('«')
              })
              .map(trimExceptedStr) || []

            
            let foundersReqests = legalFounders.map(founder => {
              // @ts-ignore
              const founderName = this.getLegalName(founder.name).replaceUnused()
              return this.checkLegalFounder(founder, founderName)
            })
            
            let personFoundersRequests = personFounders
              .filter(founder => this.getPersonInitials(founder.name))
              .map(founder => this.checkLegalPerson(founder, founder.name))
            
            let signersRequests = (legal.signers || [])
              .filter(signer => this.getPersonInitials(signer.name))
              .map(signer => this.checkLegalPerson(signer, signer.name))

            return Promise.all([...foundersReqests, ...personFoundersRequests, ...signersRequests])
              .then(res => {
                this.loading = false
                return res
              })
          })
          .catch(err => {
            this.$snotify.simple(err.Error || err)
            throw err
          })
      } else if (companyName) {
        const requisites = {
          // @ts-ignore
          nameEn: this.transliterate(companyName).toUpperCase().replaceUnused(), 
          nameUa: companyName.toUpperCase().replaceUnused(),
        }
        Vue.set(mapedObject, 'name', {})
        // @ts-ignore
        Vue.set(mapedObject.name, 'shortName', companyName)
        Vue.set(mapedObject, 'code', '00000000')
        // @ts-ignore
        return this.checkLegal(mapedObject, requisites)
          .then(res => {
            let o = this.globalObject
            // @ts-ignore
            if (![
              ...(o?.ESLegalSanctions?.data || []), 
              ...(o?.USLegalSanctions?.data || []), 
              ...(o?.UNLegalTerrors?.data || []), 
              ...(o?.UNLegalSanctions?.data || []), 
              ...(o?.RNBOLegals?.data || []), 
              ...(o?.YourControlSanctions?.data || []), 
              ...(o?.CanadaLegalSanctions?.data || []), 
              ...(o?.AustraliaLegalSanctions?.data || [])
            ].length
            ) throw new Error(resultError)
            this.loading = false
            return new Promise(resolve => { setTimeout(() => resolve(res), 0) })
          })
          .catch(err => {
            console.log(err)
            err.message !== resultError &&  this.$snotify.simple(err)
            throw err
          })
      }
    },
    /**
     * @template T
     * @param { T } mapedObject - Object on wich nested request triggered
     * @param { string | number } code - EDRPOU code */
    async mapEdrLegal(mapedObject, code) {
      try {
        if (code && this.handledEdrpous.includes(code)) return
        return await this.getEdrData(mapedObject, code)
      } catch(err) {
        this.loading = false
        this.$snotify.simple(err.Error || err)
        throw err
      }
    },
    submit() {
      if (this.$v.$invalid) return

      this.handledEdrpous.length = 0
      this.globalObject = {}

      switch (true) {
        case this.choosedLegal: return this.mapGlobalLegal(this.edrpou, this.companyName)
        case this.choosedPerson && this.personInn: return this.mapGlobalPersonInn(this.inn)
        case this.choosedPerson && this.personInitials: return this.mapGlobalPersonInitials({
          lastName: this.lastName,
          firstName: this.firstName,
          patronymic: this.patronymic ? this.patronymic : '', 
        })
      }
    },
    /** @param {string} code */
    async mapGlobalLegal(code, companyName) {
      try {
        const data = await this.getEdrData(this.globalObject, code, companyName)
          .then(res => {
            setTimeout(() => this.legalDialog = true, 0)
            console.log('Global', this.globalObject)
            return res
          })

        if (data?.data?.code === 'InvalidParameters') {
          this.$snotify.simple('Недiйсний код ЭДРПОУ')
          this.loading = false
          return
        }
      } catch (err) {
        this.loading = false
        this.$snotify.simple(err.Error || err)
      }
    },
    /** @param {string | number} inn */
    // eslint-disable-next-line
    async mapGlobalPersonInn(inn) {
      this.clearPersonData()
      this.loading = true

      const personData = await this.getEdr({
        apiKey: process.env.VUE_APP_YOUR_SCORE_API_KEY,
        inn: inn,
      }).catch(err => {
        this.$snotify.simple(err)
        throw err
      })
      if (! personData) {
        this.$snotify.simple('За вашим запитом нічого не знайдено')
        this.loading = false
        return 
      }

      if (personData?.data?.status === 'Update in progress') {
        this.attemptsToGetNewEdr ++
        return new Promise(resolve => {
          setTimeout(() => resolve(this.mapGlobalPersonInn(inn)), this.yourControlTimeOut)
        })
      }
      // @ts-ignore
      if (personData.data.code === 'InvalidParameters') {
        this.$snotify.simple('Недiйсний код IПН')
        this.loading = false
        return
      }

      this.edrListPerson.splice(0)
      this.edrListPerson.push(personData)
      // @ts-ignore
      if (!this.getPersonInitials(personData.data.name)) return
      // @ts-ignore
      const {lastName, firstName, patronymic} = this.getPersonInitials(personData.data.name)
      const person = {lastName: lastName, firstName: firstName, patronymic: patronymic}
      // @ts-ignore
      const transliteratedPerson = this.getPersonInitials(personData.data.name, {transliterate: true})
      // eslint-disable-next-line
      const yourControlPerson = {
        lastName: lastName,
        firstName: firstName,
        middleName: patronymic,
        apiKey: process.env.VUE_APP_YOUR_SCORE_API_KEY
      }

      const requests = [
        this.checkNazkDeclarations(person)
          .then(res => {
            const array = Array.isArray(res.data?.data) ? res.data?.data : []
            return this.nazkDeclarationList.push(...array)
          }),
        this.checkEDeclarations(person)
          .then(res => this.eDeclarationList.push(...res.data.results.object_list)),
        this.checkRnboPersons(person)
          .then(res => this.rnboList.push(...res.data)),
        this.checkUnTerrors(transliteratedPerson)
          .then(res => this.unTerrorList.push(...res.data)),
        this.checkUsPersonSunctions(transliteratedPerson)
          .then(res => this.usSanctionList.push(...res.data)),
        this.checkEsPersonSunctions(transliteratedPerson)
          .then(res => this.esSanctionList.push(...res.data)),
        this.checkUnPersSanctions(transliteratedPerson)
          .then(res => this.unSanctionList.push(...res.data)),
        this.checkAustraliaPersonSanctions(transliteratedPerson) 
          .then(res => this.australiaSanctionList.push(...res.data)),
        this.checkCanadaPersonSanctions(transliteratedPerson)
          .then(res => this.canadaSanctionList.push(...res.data)),
      ]

      this.yourScoreDSFMU && requests.push(
        this.getDsfmuResultUrl(yourControlPerson)
          .then(res => this.getResult({resultUrl: res.data.resultUrl, apiKey: process.env.VUE_APP_YOUR_SCORE_API_KEY})
          .then(rnboRes => {
            rnboRes?.data?.data && this.yourControlDsfmuList.push(...rnboRes.data.data)
          }))
      )

      this.yourScoreRNBO && requests.push(this.getRnboResultUrl(yourControlPerson)
        .then(res => this.getResult({resultUrl: res.data.resultUrl, apiKey: process.env.VUE_APP_YOUR_SCORE_API_KEY})
        .then(rnboRes => {
          rnboRes?.data?.data && this.yourControlRnboList.push(...rnboRes.data.data)
        }))
      )

      return await Promise.all(requests)
        .then(() => {
          this.loading = false
          this.checkPersonResult()
        })
        .catch(err => {
          this.loading = false
          this.$snotify.simple(err.Error || err)
          throw err
        })
    }, 
    checkPersonResult() {
      const innData = [
        this.edrListPerson,
        this.eDeclarationList,
        this.nazkDeclarationList,
        this.rnboList,
        this.unTerrorList,
        this.usSanctionList,
        this.esSanctionList,
        this.unSanctionList,
        this.australiaSanctionList,
        this.canadaSanctionList,
        this.yourControlDsfmuList,
        this.yourControlRnboList,
      ].filter(d => d.length > 0)
      
      if (!innData.length) {
        return this.$snotify.simple('За вашим запитом нічого не знайдено')
      } else {
        this.personDialog = true
      }
    },
    /** @param {{ lastName: string, firstName: string, patronymic: string }} person */
    // eslint-disable-next-line
    async mapGlobalPersonInitials(person) {
      this.clearPersonData()
      this.loading = true
      // eslint-disable-next-line
      const yourControlPerson = {
        lastName: person.lastName,
        firstName: person.firstName,
        middleName: person.patronymic,
        apiKey: process.env.VUE_APP_YOUR_SCORE_API_KEY,
      }
      const transliteratedPerson = this.getPersonInitials(`${person.lastName} ${person.firstName} ${person.patronymic}`, {transliterate: true})

      if (!transliteratedPerson) return

      const requests = [
        this.checkNazkDeclarations(person)
          .then(res => {
            const array = Array.isArray(res.data?.data) ? res.data?.data : []
            return this.nazkDeclarationList.push(...array)
          }),
        this.checkEDeclarations(person)
          .then(res => this.eDeclarationList.push(...res.data.results.object_list)),
        this.checkRnboPersons(person)
          .then(res => this.rnboList.push(...res.data)),
        this.checkUnTerrors(transliteratedPerson) 
          .then(res => this.unTerrorList.push(...res.data)),
        this.checkUsPersonSunctions(transliteratedPerson)
          .then(res => this.usSanctionList.push(...res.data)),
        this.checkEsPersonSunctions(transliteratedPerson)
          .then(res => this.esSanctionList.push(...res.data)),
        this.checkUnPersSanctions(transliteratedPerson)
          .then(res => this.unSanctionList.push(...res.data)),
          this.checkAustraliaPersonSanctions(transliteratedPerson) 
          .then(res => this.australiaSanctionList.push(...res.data)),
        this.checkCanadaPersonSanctions(transliteratedPerson)
          .then(res => this.canadaSanctionList.push(...res.data)),
      ]

      this.yourScoreDSFMU && requests.push(
        this.getDsfmuResultUrl(yourControlPerson)
          .then(res => this.getResult({resultUrl: res.data.resultUrl, apiKey: process.env.VUE_APP_YOUR_SCORE_API_KEY})
          .then(rnboRes => {
            this.yourControlDsfmuList.push(...rnboRes.data.data)
          }))
      )

      this.yourScoreRNBO && requests.push(
        this.getRnboResultUrl(yourControlPerson)
          .then(res => this.getResult({resultUrl: res.data.resultUrl, apiKey: process.env.VUE_APP_YOUR_SCORE_API_KEY})
          .then(rnboRes => {
            this.yourControlRnboList.push(...rnboRes.data.data)
          }))
      )

      return await Promise.all(requests)
        .then(() => {
          this.loading = false
          this.checkPersonResult()
        })
        .catch(err => {
          this.loading = false
          this.$snotify.simple(err.Error || err)
          throw err
        })
    },
    /**
     * @param {string} person
     * @param {object} [config]
     * @param {boolean} [config.capitalize]
     * @param {boolean} [config.transliterate]  */
    getPersonInitials(person, config) {
      let capitalize, transliterate 

      if (config) {
        capitalize = config.capitalize
        transliterate = config.transliterate
      }
      
      const [ lastName, firstName, patronymic ] = person.split(' ')
      if (!lastName || !firstName || lastName.length <= 1 || firstName.length <= 1) return

      let personObject = {
        firstName: firstName,
        lastName: lastName,
        patronymic: patronymic ? patronymic : '',
      }

      /** @param {function} handler */
      function modifyPerson(handler) {
        Object.keys(personObject).forEach(initial => {
          return personObject[initial] = handler(personObject[initial])
        })
        return personObject
      }

      switch (true) {
        case capitalize: return modifyPerson(this.capitalize)
        case transliterate: return modifyPerson(this.transliterate)
        default: return personObject
      }
    },
    /**
     * @param {Founder | Signer} mapedObject
     * @param {string} name
     */
    checkLegalPerson(mapedObject, name) {
      const capitalizedPersonObj = this.getPersonInitials(name, {capitalize: true})
      const transliteratedPersonObj = this.getPersonInitials(name, {transliterate: true})
      // const personObj = this.getPersonInitials(name)

      return Promise.all([
        this.yourScoreRNBO && this.getRnboResultUrl({
            lastName: capitalizedPersonObj.lastName, 
            firstName: capitalizedPersonObj.firstName, 
            middleName: capitalizedPersonObj.patronymic, 
            apiKey: process.env.VUE_APP_YOUR_SCORE_API_KEY
          })
          .then(res => this.getResult({resultUrl: res.data.resultUrl, apiKey: process.env.VUE_APP_YOUR_SCORE_API_KEY}))
          .then(res => this.assignObject(mapedObject, {YourControlRNBO: res})),

        this.yourScoreDSFMU && this.getDsfmuResultUrl({
          lastName: capitalizedPersonObj.lastName, 
          firstName: capitalizedPersonObj.firstName, 
          middleName: capitalizedPersonObj.patronymic, 
          apiKey: process.env.VUE_APP_YOUR_SCORE_API_KEY
        })
          .then(res => this.getResult({resultUrl: res.data.resultUrl, apiKey: process.env.VUE_APP_YOUR_SCORE_API_KEY})
          .then(res => this.assignObject(mapedObject, {YourControlDSFMU: res}))),
        
        this.checkNazkDeclarations(capitalizedPersonObj)
          .then(res => this.assignObject(mapedObject, {NAZKdeclarations: res})),
        this.checkEDeclarations(capitalizedPersonObj)
          .then(res => {this.assignObject(mapedObject, {EDeclarations: res}); console.log('EDeclarations', res)}),
        this.checkRnboPersons(capitalizedPersonObj)
          .then(res => this.assignObject(mapedObject, {RNBOSanctions: res})),
        this.checkUnPersSanctions(transliteratedPersonObj) 
          .then(res => this.assignObject(mapedObject, {UNPersonSanctions: res})),
        this.checkUsPersonSunctions(transliteratedPersonObj) 
          .then(res => this.assignObject(mapedObject, {USPersonSanctions: res})),
        this.checkEsPersonSunctions(transliteratedPersonObj)
          .then(res => this.assignObject(mapedObject, {ESPersonSanctions: res})),
        this.checkUnTerrors(transliteratedPersonObj) 
          .then(res => this.assignObject(mapedObject, {UNTerrorPersonSanctions: res})),
        this.checkAustraliaPersonSanctions(transliteratedPersonObj) 
          .then(res => this.assignObject(mapedObject, {AustraliaPersonSanctions: res})),
        this.checkCanadaPersonSanctions(transliteratedPersonObj)
          .then(res => this.assignObject(mapedObject, {CanadaPersonSanctions: res}))
      ])
    },
    /**
     * @param {Founder} founder
     * @param {string} founderName */
    checkLegalFounder (founder, founderName) {
      return Promise.all([
        this.mapEdrLegal(founder, founder.code),
        this.checkEsLegalSanctions({edrpou: founder.code, companyName: this.transliterate(founderName)})
          .then(res => this.assignObject(founder, {ESLegalSanctions: res})),
        this.checkUsLegalSanctions({companyName: this.transliterate(founderName)})
          .then(res => this.assignObject(founder, {USLegalSanctions: res})),
        this.checkUnLegalTerrors({companyName: this.transliterate(founderName)})
          .then(res => this.assignObject(founder, {UNLegalTerrors: res})),
        this.checkUnLegalSanctions({companyName: this.transliterate(founderName)})
          .then(res => this.assignObject(founder, {UNLegalSanctions: res})),
        this.checkRnboLegals({edrpou: founder.code, companyName: founderName})
          .then(res => this.assignObject(founder, {RNBOLegals: res})),
        this.yourScoreForeignLegalSanctions && this.checkYourControlSanctions({edrpou: founder.code, apiKey: process.env.VUE_APP_YOUR_SCORE_API_KEY})
          .then(res => this.assignObject(founder, {YourControlSanctions: res})),
        this.checkCanadaLegalSanctions({edrpou: founder.code, companyName: this.transliterate(founderName)}) 
          .then(res => this.assignObject(founder, {CanadaLegalSanctions: res})),
        this.checkAustraliaLegalSanctions({edrpou: founder.code, companyName: this.transliterate(founderName)})
          .then(res => this.assignObject(founder, {AustraliaLegalSanctions: res}))
      ])
    },
    /**
     * @param {EdrLegal} legal
     * @param {object} requisites - En/Ua
     * @param {string} requisites.nameUa
     * @param {string} requisites.nameEn */
    checkLegal (legal, requisites) {
      return Promise.all([
        this.checkEsLegalSanctions({edrpou: legal?.code, companyName: requisites.nameEn})
          .then(res => this.assignObject(legal, {ESLegalSanctions: res})),
        this.checkUsLegalSanctions({companyName: requisites.nameEn})
          .then(res => this.assignObject(legal, {USLegalSanctions: res})),
        this.checkUnLegalTerrors({companyName: requisites.nameEn})
          .then(res => this.assignObject(legal, {UNLegalTerrors: res})),
        this.checkUnLegalSanctions({companyName: requisites.nameEn})
          .then(res => this.assignObject(legal, {UNLegalSanctions: res})),
        this.checkRnboLegals({edrpou: legal?.code, companyName: requisites.nameUa})
          .then(res => this.assignObject(legal, {RNBOLegals: res})),
        this.yourScoreForeignLegalSanctions && this.checkYourControlSanctions({edrpou: legal?.code, apiKey: process.env.VUE_APP_YOUR_SCORE_API_KEY})
          .then(res => this.assignObject(legal, {YourControlSanctions: res})),
        this.checkCanadaLegalSanctions({edrpou: legal?.code, companyName: requisites.nameEn}) 
          .then(res => this.assignObject(legal, {CanadaLegalSanctions: res})),
        this.checkAustraliaLegalSanctions({edrpou: legal?.code, companyName: requisites.nameEn})
          .then(res => this.assignObject(legal, {AustraliaLegalSanctions: res}))
      ])
    },
    assignObject (source, asignObject) {
      Object.entries(asignObject).forEach(entry => this.$set(source, entry[0], entry[1]))
      return source
    },
    capitalize(str) {
      if(!str) return ''
      str = str.trim().replace(/\s+/g, ' ').split(' ')
      return str.map(text => {
        return (text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()).trim()
      }).join(' ')
    },

    // Need refactoring
    markText(handler, text) {
      switch(handler) {
        case 'legalHandler': return [
            this.edrpou ? text.indexOf(this.edrpou) : 0, 
            this.edrpou ? text.indexOf(this.edrpou) + this.edrpou.length : 0
          ]
        case 'personHandler': return [
            text.indexOf(this.lastName), 
            this.patronymic 
              ? text.indexOf(this.patronymic) + this.patronymic.length
              : this.firstName ? text.indexOf(this.firstName) + this.firstName.length : 0 
          ]
        case 'unLegalHandler': return [
            this.edrpou ? text.indexOf(this.edrpou) : 0, 
            this.edrpou ? text.indexOf(this.edrpou) + this.edrpou.length : 0
          ]
        case 'unPersonHandler': return [
            text.indexOf(this.transliterate(this.firstName)), 
            this.patronymic 
              ? text.indexOf(this.transliterate(this.patronymic)) + this.patronymic.length
              : this.lastName ? text.indexOf(this.transliterate(this.lastName)) + this.lastName.length : 0 
          ]
      }
    },
    listenPressKey(e) {
      if (e.keyCode === 13) {
        this.mapGlobalLegal(this.edrpou, this.companyName)
      } else if (e.keyCode === 27) {
        this.personDialog = false
      }
    },
    setBaseUrl() {
      this.baseUrl = process.env.NODE_ENV === "development" 
        ? 'http://127.0.0.1:4000' // http://127.0.0.1:4000
        : 'https://app.check.bestleasing.com.ua'
    }
  },
  computed: {
    transliteRule() { return transliteRule },
    requisites() {
      return !this.$v.$invalid && (this.choosedLegal || this.choosedPerson && (this.personInitials || this.personInn))
    },
    choosedPerson() {
      return this.searchVariant === 1
    },
    choosedLegal() {
      return this.searchVariant === 2
    },
    choosedEdrpou() {
      return this.legalSearchVariant === 1
    },
    choosedCompanyName() {
      return this.legalSearchVariant === 2
    },
    personInitials() {
      return this.searchType === "searchByInitials"
    },
    personInn() {
      return this.searchType === "searchByInn"
    },
    legalEdrpou() {
      return this.searchType === "searchByEdrpou"
    },
    // validations
    companyNameErr() {
      if (! this.$v.companyName.$error) return
      else return this.commonErr
    },
    edrpouErr() { 
      const errors = []
      if (!this.$v.edrpou.$error) return errors
      !this.$v.edrpou.required && errors.push('Невiрний код ЄДРПОУ')
      !this.$v.edrpou.minLength && errors.push('Не вiрна кiлькiсть знакiв')
      return errors
    }, 
    lastNameErr() {
      if (! this.$v.lastName.$error) return
      else return this.commonErr
    }, 
    firstNameErr() {
      if (! this.$v.firstName.$error) return
      else return this.commonErr
    }, 
    // patronymicErr() {
    //   if (! this.$v.patronymic.$error) return
    //   else return this.commonErr
    // },
    innErr() {
      const errors = []
      if (! this.$v.inn.$error) return errors
      !this.$v.inn.required && errors.push('Невiрний код IНН')
      !this.$v.inn.minLength && errors.push('Не вiрна кiлькiсть знакiв')
      return errors
    },
  }, 
  watch: {
    loading(v) {
      console.log('loading: ', v)
    },
    personDialog(val) {
      if(!val) {
        this.ukVersion = true
        this.showRequisite = false
      }
    },
    searchVariant() {
      this.searchType = null
      this.clearLegalFields()
      this.clearPersonFields()
    },
    searchType() {
      this.clearPersonFields()
    }
  },
  mounted() {
    window.addEventListener('keydown', this.listenPressKey)
    this.setBaseUrl()
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.listenPressKey)
  }
}

export { legal }