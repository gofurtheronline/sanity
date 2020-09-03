import {DiffComponent} from '../types'
import {NumberFieldDiff} from '../../types/number/diff'
import {StringFieldDiff} from '../../types/string/diff'
import {ReferenceFieldDiff} from '../../types/reference/diff'
import {ImageFieldDiff} from '../../types/image/diff'
import {FileFieldDiff} from '../../types/file/diff'
import {BooleanFieldDiff} from '../../types/boolean/diff'
import {ObjectFieldDiff} from '../../types/object/diff'

export const defaultComponents: {[key: string]: DiffComponent<any>} = {
  object: ObjectFieldDiff,
  string: StringFieldDiff,
  number: NumberFieldDiff,
  reference: ReferenceFieldDiff,
  image: ImageFieldDiff,
  boolean: BooleanFieldDiff,
  file: FileFieldDiff
}